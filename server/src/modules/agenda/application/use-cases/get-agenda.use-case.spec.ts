import { BadRequestException } from '@nestjs/common';
import { AppointmentStatus } from '../../../../shared/domain/enums/appointment-status.enum.js';
import { ScheduleBlockType } from '../../../../shared/domain/enums/schedule-block-type.enum.js';
import type { AuthenticatedUser } from '../../../../shared/domain/interfaces/authenticated-user.interface.js';
import type {
  AgendaAppointmentRow,
  AgendaBlockRow,
  AgendaDoctorRow,
  AgendaHolidayRow,
  AgendaRows,
  AgendaScheduleRow,
  IAgendaReadRepository,
} from '../../domain/repositories/agenda-read.repository.js';
import type {
  AgendaDoctorRef,
  AgendaScope,
} from '../../domain/services/agenda-scope.policy.js';
import { GetAgendaUseCase } from './get-agenda.use-case.js';

const day = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
const time = (hhmm: string) => new Date(`1970-01-01T${hhmm}:00.000Z`);

type StoredDoctor = AgendaDoctorRow & {
  userId: number;
  clinicId: number | null;
};

/**
 * Doble en memoria que aplica los mismos predicados de alcance que el
 * repositorio Prisma (médico o sede del alcance; feriados globales y de esa
 * sede). La consulta real se prueba contra PostgreSQL en la integración.
 */
class InMemoryAgendaReadRepository implements IAgendaReadRepository {
  timezones = new Map<number, string>([
    [1, 'UTC'],
    [2, 'UTC'],
  ]);
  doctors: StoredDoctor[] = [];
  schedules: AgendaScheduleRow[] = [];
  appointments: AgendaAppointmentRow[] = [];
  blocks: AgendaBlockRow[] = [];
  holidays: AgendaHolidayRow[] = [];

  findDoctor(doctorId: number): Promise<AgendaDoctorRef | null> {
    const doctor = this.doctors.find((d) => d.id === doctorId);
    return Promise.resolve(
      doctor ? { id: doctor.id, clinicId: doctor.clinicId } : null,
    );
  }

  findDoctorByUserId(userId: number): Promise<AgendaDoctorRef | null> {
    const doctor = this.doctors.find((d) => d.userId === userId);
    return Promise.resolve(
      doctor ? { id: doctor.id, clinicId: doctor.clinicId } : null,
    );
  }

  clinicExists(clinicId: number): Promise<boolean> {
    return Promise.resolve(this.timezones.has(clinicId));
  }

  load(scope: AgendaScope, from: Date, to: Date): Promise<AgendaRows> {
    const inScope = (doctorId: number) =>
      scope.kind === 'doctor'
        ? doctorId === scope.doctorId
        : this.doctors.find((d) => d.id === doctorId)?.clinicId ===
          scope.clinicId;
    const inRange = (date: Date) => date >= from && date <= to;

    return Promise.resolve({
      timezone:
        (scope.clinicId && this.timezones.get(scope.clinicId)) ||
        'America/Lima',
      doctors: this.doctors
        .filter((d) => inScope(d.id))
        .map(({ id, name, lastName, specialties }) => ({
          id,
          name,
          lastName,
          specialties,
        })),
      schedules: this.schedules.filter(
        (s) => inScope(s.doctorId) && inRange(s.scheduleDate),
      ),
      appointments: this.appointments.filter(
        (a) => inScope(a.doctorId) && inRange(a.scheduleDate),
      ),
      blocks: this.blocks.filter(
        (b) => inScope(b.doctorId) && b.startDate <= to && b.endDate >= from,
      ),
      holidays: this.holidays.filter(
        (h) =>
          inRange(h.date) &&
          (h.clinicId === null || h.clinicId === scope.clinicId),
      ),
    });
  }
}

const actor = (
  roleName: string,
  clinicId: number | null,
  id = 1,
): AuthenticatedUser => ({
  id,
  email: `${roleName.toLowerCase()}@test.local`,
  roleId: 1,
  roleName,
  clinicId,
});

const receptionist = actor('RECEPTIONIST', 1);
const superAdmin = actor('SUPER_ADMIN', null);
const doctorUser = actor('DOCTOR', 1, 100);

/** Bloque de 08:00 a 09:00 con cupos de 30 min: 08:00 y 08:30. */
const schedule = (
  overrides: Partial<AgendaScheduleRow> = {},
): AgendaScheduleRow => ({
  id: 40,
  doctorId: 10,
  specialtyId: 1,
  scheduleDate: day('2099-03-10'),
  timeFrom: time('08:00'),
  timeTo: time('09:00'),
  durationMinutes: 30,
  bufferMinutes: 0,
  ...overrides,
});

const appointment = (
  overrides: Partial<AgendaAppointmentRow> = {},
): AgendaAppointmentRow => ({
  id: 101,
  scheduleId: 40,
  doctorId: 10,
  specialtyId: 1,
  scheduleDate: day('2099-03-10'),
  startTime: time('08:00'),
  endTime: time('08:30'),
  status: AppointmentStatus.CONFIRMED,
  paymentStatus: 'PAID',
  isOverbook: false,
  isAtRisk: false,
  pendingUntil: null,
  patient: { id: 500, name: 'Ana', lastName: 'Paciente' },
  ...overrides,
});

const holiday = (
  overrides: Partial<AgendaHolidayRow> = {},
): AgendaHolidayRow => ({
  id: 1,
  date: day('2099-03-10'),
  name: 'Feriado',
  clinicId: null,
  ...overrides,
});

describe('GetAgendaUseCase', () => {
  let repository: InMemoryAgendaReadRepository;
  let useCase: GetAgendaUseCase;

  const week = { from: '2099-03-09', to: '2099-03-15' };
  const availability = (result: {
    cupos: { date: string; startTime: string; available: boolean }[];
  }) =>
    result.cupos.map(
      (c) => `${c.date} ${c.startTime} ${c.available ? 'libre' : 'no'}`,
    );

  beforeEach(() => {
    repository = new InMemoryAgendaReadRepository();
    repository.doctors = [
      {
        id: 10,
        userId: 100,
        clinicId: 1,
        name: 'Lucía',
        lastName: 'Paredes',
        specialties: [{ id: 1, name: 'Cardiología' }],
      },
      {
        id: 11,
        userId: 110,
        clinicId: 1,
        name: 'Mario',
        lastName: 'Rey',
        specialties: [{ id: 2, name: 'Dermatología' }],
      },
      {
        id: 20,
        userId: 200,
        clinicId: 2,
        name: 'Camila',
        lastName: 'Rojas',
        specialties: [{ id: 1, name: 'Cardiología' }],
      },
    ];
    repository.schedules = [schedule()];
    useCase = new GetAgendaUseCase(repository);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('arma la agenda del médico en hora local con fechas YYYY-MM-DD y el paciente sin datos de contacto', async () => {
    repository.appointments = [appointment()];

    const result = await useCase.execute(doctorUser, week);

    expect(result.timezone).toBe('UTC');
    expect(result.range).toEqual(week);
    expect(result.doctors).toEqual([
      {
        id: 10,
        fullName: 'Lucía Paredes',
        specialties: [{ id: 1, name: 'Cardiología' }],
      },
    ]);
    expect(result.cupos).toEqual([
      {
        scheduleId: 40,
        doctorId: 10,
        specialtyId: 1,
        date: '2099-03-10',
        startTime: '08:00',
        endTime: '08:30',
        available: false,
      },
      {
        scheduleId: 40,
        doctorId: 10,
        specialtyId: 1,
        date: '2099-03-10',
        startTime: '08:30',
        endTime: '09:00',
        available: true,
      },
    ]);
    expect(result.appointments).toEqual([
      {
        id: 101,
        scheduleId: 40,
        doctorId: 10,
        specialtyId: 1,
        date: '2099-03-10',
        startTime: '08:00',
        endTime: '08:30',
        status: 'CONFIRMED',
        paymentStatus: 'PAID',
        isOverbook: false,
        isAtRisk: false,
        patient: { id: 500, fullName: 'Ana Paciente' },
      },
    ]);
  });

  it('un feriado de otra sede no aparece ni anula cupos', async () => {
    repository.holidays = [holiday({ clinicId: 2, name: 'Feriado sede 2' })];

    const result = await useCase.execute(receptionist, {
      ...week,
      doctorId: 10,
    });

    expect(result.holidays).toEqual([]);
    expect(result.cupos.every((c) => c.available)).toBe(true);
  });

  it('un feriado global y uno de la propia sede aparecen y anulan los cupos de su día', async () => {
    repository.schedules = [
      schedule(),
      schedule({ id: 41, scheduleDate: day('2099-03-11') }),
      schedule({ id: 42, scheduleDate: day('2099-03-12') }),
    ];
    repository.holidays = [
      holiday({ id: 1, name: 'Global', date: day('2099-03-10') }),
      holiday({ id: 2, name: 'Sede 1', date: day('2099-03-11'), clinicId: 1 }),
    ];

    const result = await useCase.execute(receptionist, {
      ...week,
      doctorId: 10,
    });

    expect(result.holidays).toEqual([
      { id: 1, date: '2099-03-10', name: 'Global', scope: 'GLOBAL' },
      { id: 2, date: '2099-03-11', name: 'Sede 1', scope: 'CLINIC' },
    ]);
    expect(availability(result)).toEqual([
      '2099-03-10 08:00 no',
      '2099-03-10 08:30 no',
      '2099-03-11 08:00 no',
      '2099-03-11 08:30 no',
      '2099-03-12 08:00 libre',
      '2099-03-12 08:30 libre',
    ]);
  });

  it('un cupo solapado con una cita del médico en otra especialidad no está disponible', async () => {
    repository.schedules = [
      schedule(),
      schedule({
        id: 43,
        specialtyId: 2,
        timeFrom: time('10:00'),
        timeTo: time('11:00'),
      }),
    ];
    repository.appointments = [
      appointment({
        id: 102,
        scheduleId: 43,
        specialtyId: 2,
        startTime: time('08:30'),
        endTime: time('09:00'),
      }),
    ];

    const result = await useCase.execute(doctorUser, week);

    expect(availability(result).slice(0, 2)).toEqual([
      '2099-03-10 08:00 libre',
      '2099-03-10 08:30 no',
    ]);
  });

  it('una inasistencia se devuelve pero no ocupa el cupo', async () => {
    repository.appointments = [
      appointment({ status: AppointmentStatus.NO_SHOW }),
    ];

    const result = await useCase.execute(doctorUser, week);

    expect(result.appointments.map((a) => a.status)).toEqual(['NO_SHOW']);
    expect(result.cupos.every((c) => c.available)).toBe(true);
    expect(result.indicators.bookedCupos).toBe(0);
  });

  it('un bloqueo TIME_RANGE anula los cupos que toca y se devuelve en hora local', async () => {
    repository.blocks = [
      {
        id: 7,
        doctorId: 10,
        type: ScheduleBlockType.TIME_RANGE,
        startDate: day('2099-03-10'),
        endDate: day('2099-03-10'),
        timeFrom: time('08:30'),
        timeTo: time('09:00'),
        reason: 'Junta médica',
      },
    ];

    const result = await useCase.execute(doctorUser, week);

    expect(availability(result)).toEqual([
      '2099-03-10 08:00 libre',
      '2099-03-10 08:30 no',
    ]);
    expect(result.blocks).toEqual([
      {
        id: 7,
        doctorId: 10,
        type: 'TIME_RANGE',
        startDate: '2099-03-10',
        endDate: '2099-03-10',
        timeFrom: '08:30',
        timeTo: '09:00',
        reason: 'Junta médica',
      },
    ]);
  });

  it('SUPER_ADMIN sin sede recibe solo los feriados globales y de la sede del médico pedido', async () => {
    repository.schedules = [schedule({ doctorId: 20 })];
    repository.holidays = [
      holiday({ id: 1, name: 'Global', date: day('2099-03-12') }),
      holiday({ id: 2, name: 'Sede 1', date: day('2099-03-13'), clinicId: 1 }),
      holiday({ id: 3, name: 'Sede 2', date: day('2099-03-14'), clinicId: 2 }),
    ];

    const result = await useCase.execute(superAdmin, { ...week, doctorId: 20 });

    expect(result.holidays.map((h) => h.name)).toEqual(['Global', 'Sede 2']);
    expect(result.doctors.map((d) => d.id)).toEqual([20]);
  });

  it('la agenda de sede trae solo los médicos de esa sede', async () => {
    repository.schedules = [
      schedule(),
      schedule({ id: 44, doctorId: 11 }),
      schedule({ id: 45, doctorId: 20 }),
    ];

    const result = await useCase.execute(receptionist, {
      from: '2099-03-10',
      to: '2099-03-10',
    });

    expect(result.doctors.map((d) => d.id)).toEqual([10, 11]);
    expect([...new Set(result.cupos.map((c) => c.doctorId))]).toEqual([10, 11]);
  });

  it('los indicadores coinciden con los cupos y citas devueltos', async () => {
    jest.useFakeTimers({ now: new Date('2099-03-01T12:00:00.000Z') });
    repository.schedules = [
      schedule(),
      schedule({ id: 41, scheduleDate: day('2099-03-11') }),
    ];
    repository.holidays = [holiday({ date: day('2099-03-11') })];
    repository.appointments = [
      appointment(),
      appointment({
        id: 103,
        status: AppointmentStatus.CANCELLED,
        startTime: time('08:30'),
        endTime: time('09:00'),
      }),
      appointment({
        id: 104,
        isOverbook: true,
        isAtRisk: true,
        status: AppointmentStatus.PENDING,
        paymentStatus: 'PENDING',
        pendingUntil: new Date('2099-03-01T12:10:00.000Z'),
      }),
    ];

    const result = await useCase.execute(doctorUser, week);

    expect(result.cupos).toHaveLength(4);
    expect(result.indicators).toEqual({
      totalCupos: 2, // los dos del 11 caen en feriado
      bookedCupos: 1,
      occupancyRate: 0.5,
      byStatus: {
        PENDING: 1,
        CONFIRMED: 1,
        IN_PROGRESS: 0,
        COMPLETED: 0,
        CANCELLED: 1,
        NO_SHOW: 0,
      },
      atRisk: 1,
      pendingPayment: 1,
    });
  });

  it('los días pasados no ofrecen cupos y hoy exige 2 h de anticipación en hora de la sede', async () => {
    jest.useFakeTimers({ now: new Date('2099-03-10T06:15:00.000Z') });
    repository.schedules = [
      schedule({ id: 46, scheduleDate: day('2099-03-09') }),
      schedule({ timeFrom: time('08:00'), timeTo: time('09:30') }),
      schedule({ id: 47, scheduleDate: day('2099-03-11') }),
    ];

    const result = await useCase.execute(doctorUser, week);

    expect(availability(result)).toEqual([
      '2099-03-09 08:00 no',
      '2099-03-09 08:30 no',
      '2099-03-10 08:00 no',
      '2099-03-10 08:30 libre',
      '2099-03-10 09:00 libre',
      '2099-03-11 08:00 libre',
      '2099-03-11 08:30 libre',
    ]);
  });

  it.each([
    [
      '43 días en alcance médico',
      doctorUser,
      { from: '2099-03-01', to: '2099-04-12' },
    ],
    [
      '8 días en alcance sede',
      receptionist,
      { from: '2099-03-09', to: '2099-03-16' },
    ],
    [
      'to anterior a from',
      doctorUser,
      { from: '2099-03-10', to: '2099-03-09' },
    ],
    [
      'una fecha que no existe',
      doctorUser,
      { from: '2099-02-27', to: '2099-02-30' },
    ],
  ])('rechaza con 400: %s', async (_case, user, query) => {
    await expect(useCase.execute(user, query)).rejects.toThrow(
      BadRequestException,
    );
  });

  it.each([
    [
      '42 días en alcance médico',
      doctorUser,
      { from: '2099-03-01', to: '2099-04-11' },
    ],
    [
      '7 días en alcance sede',
      receptionist,
      { from: '2099-03-09', to: '2099-03-15' },
    ],
  ])('acepta el límite: %s', async (_case, user, query) => {
    await expect(useCase.execute(user, query)).resolves.toBeDefined();
  });
});
