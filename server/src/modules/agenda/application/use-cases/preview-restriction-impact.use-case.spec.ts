import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { AppointmentStatus } from '../../../../shared/domain/enums/appointment-status.enum.js';
import { ScheduleBlockType } from '../../../../shared/domain/enums/schedule-block-type.enum.js';
import type { AuthenticatedUser } from '../../../../shared/domain/interfaces/authenticated-user.interface.js';
import type {
  ImpactAppointmentFilter,
  ImpactAppointmentRow,
  ImpactBlockRow,
  ImpactHolidayRow,
  IRestrictionImpactRepository,
} from '../../domain/repositories/restriction-impact.repository.js';
import type {
  AgendaDoctorRef,
  AgendaScopeLookups,
} from '../../domain/services/agenda-scope.policy.js';
import type { RestrictionImpactQueryDto } from '../dto/restriction-impact-query.dto.js';
import { PreviewRestrictionImpactUseCase } from './preview-restriction-impact.use-case.js';

const day = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
const time = (hhmm: string) => new Date(`1970-01-01T${hhmm}:00.000Z`);

type StoredDoctor = AgendaDoctorRef & { userId: number };

/**
 * Doble en memoria con los mismos predicados que el repositorio Prisma:
 * citas de un médico, de una sede (`appointments.clinicId`) o de todas;
 * bloqueos activos del médico que se solapan; feriados activos del rango.
 */
class InMemoryImpactRepository
  implements IRestrictionImpactRepository, AgendaScopeLookups
{
  clinics = new Set([1, 2]);
  doctors: StoredDoctor[] = [];
  appointments: ImpactAppointmentRow[] = [];
  blocks: (ImpactBlockRow & { doctorId: number })[] = [];
  holidays: ImpactHolidayRow[] = [];

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
    return Promise.resolve(this.clinics.has(clinicId));
  }

  findAppointments(
    filter: ImpactAppointmentFilter,
    from: Date,
    to: Date,
  ): Promise<ImpactAppointmentRow[]> {
    return Promise.resolve(
      this.appointments.filter(
        (a) =>
          a.scheduleDate >= from &&
          a.scheduleDate <= to &&
          ('doctorId' in filter
            ? a.doctorId === filter.doctorId
            : 'clinicId' in filter
              ? a.clinicId === filter.clinicId
              : true),
      ),
    );
  }

  findBlocks(
    doctorId: number,
    from: Date,
    to: Date,
  ): Promise<ImpactBlockRow[]> {
    return Promise.resolve(
      this.blocks.filter(
        (b) =>
          b.doctorId === doctorId && b.startDate <= to && b.endDate >= from,
      ),
    );
  }

  findBlock(blockId: number, doctorId: number): Promise<ImpactBlockRow | null> {
    return Promise.resolve(
      this.blocks.find((b) => b.id === blockId && b.doctorId === doctorId) ??
        null,
    );
  }

  findHolidays(from: Date, to: Date): Promise<ImpactHolidayRow[]> {
    return Promise.resolve(
      this.holidays.filter((h) => h.date >= from && h.date <= to),
    );
  }

  findHoliday(holidayId: number): Promise<ImpactHolidayRow | null> {
    return Promise.resolve(
      this.holidays.find((h) => h.id === holidayId) ?? null,
    );
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

/** Cita confirmada y pagada de Lucía Paredes (médico 12, sede 1) el 21/10 de 10:30 a 11:00. */
const appointment = (
  overrides: Partial<ImpactAppointmentRow> = {},
): ImpactAppointmentRow => ({
  id: 101,
  doctorId: 12,
  doctor: { name: 'Lucía', lastName: 'Paredes' },
  specialtyName: 'Cardiología',
  clinicId: 1,
  scheduleDate: day('2026-10-21'),
  startTime: time('10:30'),
  endTime: time('11:00'),
  status: AppointmentStatus.CONFIRMED,
  paymentStatus: 'PAID',
  patient: { id: 100, name: 'Ana', lastName: 'Torres' },
  ...overrides,
});

const fullDay = (
  overrides: Partial<RestrictionImpactQueryDto> = {},
): RestrictionImpactQueryDto => ({
  type: 'FULL_DAY',
  doctorId: 12,
  startDate: '2026-10-21',
  endDate: '2026-10-23',
  ...overrides,
});

describe('PreviewRestrictionImpactUseCase', () => {
  let repository: InMemoryImpactRepository;
  let useCase: PreviewRestrictionImpactUseCase;

  beforeEach(() => {
    repository = new InMemoryImpactRepository();
    repository.doctors = [
      { id: 12, clinicId: 1, userId: 100 },
      { id: 13, clinicId: 2, userId: 101 },
    ];
    useCase = new PreviewRestrictionImpactUseCase(repository, repository);
  });

  it('una cita confirmada dentro de un bloqueo de día completo aparece con sus datos en hora local', async () => {
    repository.appointments = [appointment()];

    const result = await useCase.execute(receptionist, fullDay());

    expect(result).toEqual({
      total: 1,
      withPayment: 1,
      appointments: [
        {
          id: 101,
          doctorId: 12,
          doctorName: 'Lucía Paredes',
          specialtyName: 'Cardiología',
          date: '2026-10-21',
          startTime: '10:30',
          endTime: '11:00',
          status: AppointmentStatus.CONFIRMED,
          paymentStatus: 'PAID',
          patient: { id: 100, fullName: 'Ana Torres' },
        },
      ],
    });
  });

  it('solo cuenta las citas que la cancelación puede transicionar: pendientes y confirmadas', async () => {
    repository.appointments = [
      appointment({
        id: 1,
        status: AppointmentStatus.PENDING,
        paymentStatus: 'PENDING',
      }),
      appointment({ id: 2, status: AppointmentStatus.CONFIRMED }),
      appointment({ id: 3, status: AppointmentStatus.CANCELLED }),
      appointment({ id: 4, status: AppointmentStatus.NO_SHOW }),
      appointment({ id: 5, status: AppointmentStatus.IN_PROGRESS }),
      appointment({ id: 6, status: AppointmentStatus.COMPLETED }),
    ];

    const result = await useCase.execute(receptionist, fullDay());

    expect(result.appointments.map((a) => a.id)).toEqual([1, 2]);
  });

  it('un bloqueo por horas solo afecta las citas que se solapan con su franja', async () => {
    repository.appointments = [
      appointment({ id: 1, startTime: time('09:30'), endTime: time('10:00') }),
      appointment({ id: 2, startTime: time('09:45'), endTime: time('10:15') }),
      appointment({ id: 3, startTime: time('11:45'), endTime: time('12:15') }),
      appointment({ id: 4, startTime: time('12:00'), endTime: time('12:30') }),
    ];

    const result = await useCase.execute(
      receptionist,
      fullDay({
        type: 'TIME_RANGE',
        endDate: '2026-10-21',
        timeFrom: '10:00',
        timeTo: '12:00',
      }),
    );

    expect(result.appointments.map((a) => a.id)).toEqual([2, 3]);
  });

  it('ordena por fecha y hora y cuenta con pago las pagadas y las de seña', async () => {
    repository.appointments = [
      appointment({
        id: 1,
        scheduleDate: day('2026-10-22'),
        startTime: time('08:00'),
        endTime: time('08:30'),
        paymentStatus: 'PARTIAL',
      }),
      appointment({
        id: 2,
        startTime: time('11:00'),
        endTime: time('11:30'),
        paymentStatus: 'PENDING',
        status: AppointmentStatus.PENDING,
      }),
      appointment({
        id: 3,
        startTime: time('09:00'),
        endTime: time('09:30'),
        paymentStatus: 'PAID',
      }),
    ];

    const result = await useCase.execute(receptionist, fullDay());

    expect(result.appointments.map((a) => a.id)).toEqual([3, 2, 1]);
    expect(result).toMatchObject({ total: 3, withPayment: 2 });
  });

  it('un médico de otra sede responde 404, y el médico solo previsualiza su propia agenda', async () => {
    await expect(
      useCase.execute(receptionist, fullDay({ doctorId: 13 })),
    ).rejects.toThrow(NotFoundException);
    await expect(
      useCase.execute(actor('DOCTOR', 1, 100), fullDay({ doctorId: 13 })),
    ).rejects.toThrow(NotFoundException);
    await expect(
      useCase.execute(actor('DOCTOR', 1, 100), fullDay()),
    ).resolves.toMatchObject({ total: 0 });
  });

  it.each<[string, Partial<RestrictionImpactQueryDto>]>([
    ['bloqueo sin médico', { doctorId: undefined }],
    ['bloqueo con sede', { clinicId: 1 }],
    ['feriado con médico', { type: 'HOLIDAY', endDate: '2026-10-21' }],
    ['feriado de varios días', { type: 'HOLIDAY', doctorId: undefined }],
    ['franja sin horas', { type: 'TIME_RANGE' }],
    ['día completo con horas', { timeFrom: '10:00', timeTo: '12:00' }],
    [
      'franja que termina antes de empezar',
      { type: 'TIME_RANGE', timeFrom: '12:00', timeTo: '10:00' },
    ],
    [
      'fin antes del inicio',
      { startDate: '2026-10-23', endDate: '2026-10-21' },
    ],
    ['fecha inexistente', { startDate: '2026-02-30', endDate: '2026-03-02' }],
    ['rango de más de 62 días', { endDate: '2026-12-22' }],
  ])('400: %s', async (_case, overrides) => {
    await expect(
      useCase.execute(receptionist, fullDay(overrides)),
    ).rejects.toThrow(BadRequestException);
  });

  describe('feriados', () => {
    const holiday = (
      overrides: Partial<RestrictionImpactQueryDto> = {},
    ): RestrictionImpactQueryDto => ({
      type: 'HOLIDAY',
      startDate: '2026-10-21',
      endDate: '2026-10-21',
      ...overrides,
    });

    beforeEach(() => {
      repository.appointments = [
        appointment({ id: 1 }),
        appointment({
          id: 2,
          doctorId: 13,
          clinicId: 2,
          doctor: { name: 'Camila', lastName: 'Rojas' },
        }),
        appointment({ id: 3, scheduleDate: day('2026-10-22') }),
      ];
    });

    it('para el personal con sede vale su sede aunque omita clinicId: la cita de otra sede no cuenta', async () => {
      const result = await useCase.execute(receptionist, holiday());

      expect(result.appointments.map((a) => a.id)).toEqual([1]);
    });

    it('un feriado de la sede B no afecta las citas de la sede A', async () => {
      const result = await useCase.execute(
        superAdmin,
        holiday({ clinicId: 2 }),
      );

      expect(result.appointments.map((a) => a.id)).toEqual([2]);
    });

    it('un feriado global, solo de un administrador global, afecta las citas de todas las sedes', async () => {
      const result = await useCase.execute(superAdmin, holiday());

      expect(result.appointments.map((a) => a.id)).toEqual([1, 2]);
    });

    it('el personal no consulta feriados de otra sede, el médico no consulta feriados y una sede inexistente responde 404', async () => {
      await expect(
        useCase.execute(receptionist, holiday({ clinicId: 2 })),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        useCase.execute(actor('DOCTOR', 1, 100), holiday()),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        useCase.execute(superAdmin, holiday({ clinicId: 99 })),
      ).rejects.toThrow(NotFoundException);
    });

    it('al mover un feriado, su fecha actual no se cuenta', async () => {
      repository.holidays = [{ id: 3, date: day('2026-10-21'), clinicId: 1 }];

      // Se evalúan el 21 (fecha actual) y el 22 (nueva); el 21 ya no queda cubierto.
      const moved = await useCase.execute(
        receptionist,
        holiday({
          startDate: '2026-10-22',
          endDate: '2026-10-22',
          excludeRestrictionId: 3,
        }),
      );

      expect(moved.appointments.map((a) => a.id)).toEqual([3]);
    });
  });

  describe('al editar una restricción existente', () => {
    /** Bloqueo 7 de 10:00 a 12:00 el 21/10, que se acorta a 10:00–11:00. */
    const shorten = fullDay({
      type: 'TIME_RANGE',
      endDate: '2026-10-21',
      timeFrom: '10:00',
      timeTo: '11:00',
      excludeRestrictionId: 7,
    });

    beforeEach(() => {
      repository.blocks = [
        {
          id: 7,
          doctorId: 12,
          type: ScheduleBlockType.TIME_RANGE,
          startDate: day('2026-10-21'),
          endDate: day('2026-10-21'),
          timeFrom: time('10:00'),
          timeTo: time('12:00'),
        },
      ];
      repository.appointments = [
        appointment({
          id: 1,
          startTime: time('11:00'),
          endTime: time('11:30'),
        }),
      ];
    });

    it('su versión actual no se cuenta', async () => {
      const result = await useCase.execute(receptionist, shorten);

      expect(result.total).toBe(0);
    });

    it('sin excluirla, la versión actual sigue cubriendo la cita', async () => {
      const result = await useCase.execute(receptionist, {
        ...shorten,
        excludeRestrictionId: undefined,
      });

      expect(result.appointments.map((a) => a.id)).toEqual([1]);
    });

    it('otro bloqueo vigente que cubre la cita la sigue cancelando, como en el listener', async () => {
      repository.blocks.push({
        id: 8,
        doctorId: 12,
        type: ScheduleBlockType.TIME_RANGE,
        startDate: day('2026-10-21'),
        endDate: day('2026-10-21'),
        timeFrom: time('11:00'),
        timeTo: time('11:30'),
      });

      const result = await useCase.execute(receptionist, shorten);

      expect(result.appointments.map((a) => a.id)).toEqual([1]);
    });
  });
});
