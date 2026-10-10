import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AppointmentStatus } from '../../../../shared/domain/enums/appointment-status.enum.js';
import { ScheduleBlockType } from '../../../../shared/domain/enums/schedule-block-type.enum.js';
import type { AuthenticatedUser } from '../../../../shared/domain/interfaces/authenticated-user.interface.js';
import { dateToTimeString } from '../../../../shared/utils/date-time.utils.js';
import type {
  ImpactAppointmentRow,
  ImpactBlockRow,
  IRestrictionImpactRepository,
} from '../../domain/repositories/restriction-impact.repository.js';
import {
  type AgendaScopeLookups,
  resolveAgendaScope,
} from '../../domain/services/agenda-scope.policy.js';
import {
  blockCovers,
  type CoverageAppointment,
  type CoverageBlock,
  type CoverageHoliday,
  holidayCovers,
} from '../../domain/services/restriction-coverage.js';
import type { RestrictionImpactQueryDto } from '../dto/restriction-impact-query.dto.js';
import type { RestrictionImpactResponseDto } from '../dto/restriction-impact-response.dto.js';

const dayKey = (date: Date) => date.toISOString().slice(0, 10);
const day = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
const minDay = (a: Date, b?: Date) => (b && b < a ? b : a);
const maxDay = (a: Date, b?: Date) => (b && b > a ? b : a);

const DAY_MS = 24 * 60 * 60 * 1000;
/** Mismo tope que `available-days`. */
const MAX_RANGE_DAYS = 62;

/** Los únicos estados que `cancelAtomically` transiciona a CANCELLED. */
const CANCELLABLE = new Set<AppointmentStatus>([
  AppointmentStatus.PENDING,
  AppointmentStatus.CONFIRMED,
]);
/** Con fondos cobrados: quedarían con reembolso pendiente. */
const WITH_PAYMENT = new Set(['PAID', 'PARTIAL']);

const toCoverage = (a: ImpactAppointmentRow): CoverageAppointment => ({
  date: dayKey(a.scheduleDate),
  startTime: dateToTimeString(a.startTime),
  endTime: dateToTimeString(a.endTime),
  clinicId: a.clinicId,
});

const toCoverageBlock = (b: ImpactBlockRow): CoverageBlock => ({
  type: b.type === ScheduleBlockType.TIME_RANGE ? 'TIME_RANGE' : 'FULL_DAY',
  startDate: dayKey(b.startDate),
  endDate: dayKey(b.endDate),
  timeFrom: b.timeFrom ? dateToTimeString(b.timeFrom) : null,
  timeTo: b.timeTo ? dateToTimeString(b.timeTo) : null,
});

const isGlobalAdmin = (actor: AuthenticatedUser) =>
  actor.roleName === 'SUPER_ADMIN' ||
  (actor.roleName === 'ADMIN' && actor.clinicId === null);

/**
 * Use Case: vista previa de las citas que cancelaría una restricción de
 * disponibilidad antes de guardarla. Usa la misma resolución que
 * `AvailabilityChangeListener`: la unión del rango actual y el nuevo, evaluada
 * contra el estado final (la restricción editada reemplazada por el borrador).
 * Solo lectura e informativa: la decisión final sigue siendo del listener
 * contra el estado comprometido.
 */
@Injectable()
export class PreviewRestrictionImpactUseCase {
  constructor(
    @Inject('IAgendaReadRepository')
    private readonly lookups: AgendaScopeLookups,
    @Inject('IRestrictionImpactRepository')
    private readonly repository: IRestrictionImpactRepository,
  ) {}

  async execute(
    actor: AuthenticatedUser,
    query: RestrictionImpactQueryDto,
  ): Promise<RestrictionImpactResponseDto> {
    validate(query);
    const affected =
      query.type === 'HOLIDAY'
        ? await this.holidayImpact(actor, query)
        : await this.blockImpact(actor, query);
    return respond(affected);
  }

  private async blockImpact(
    actor: AuthenticatedUser,
    query: RestrictionImpactQueryDto,
  ): Promise<ImpactAppointmentRow[]> {
    const scope = await resolveAgendaScope(
      actor,
      { doctorId: query.doctorId },
      this.lookups,
    );
    const doctorId = scope.kind === 'doctor' ? scope.doctorId : 0;
    const draft: CoverageBlock = {
      type: query.type === 'TIME_RANGE' ? 'TIME_RANGE' : 'FULL_DAY',
      startDate: query.startDate,
      endDate: query.endDate,
      timeFrom: query.timeFrom ?? null,
      timeTo: query.timeTo ?? null,
    };

    const excluded = query.excludeRestrictionId
      ? await this.repository.findBlock(query.excludeRestrictionId, doctorId)
      : null;
    const from = minDay(day(query.startDate), excluded?.startDate);
    const to = maxDay(day(query.endDate), excluded?.endDate);

    const [appointments, blocks] = await Promise.all([
      this.repository.findAppointments({ doctorId }, from, to),
      this.repository.findBlocks(doctorId, from, to),
    ]);
    const finalBlocks = [
      draft,
      ...blocks.filter((b) => b.id !== excluded?.id).map(toCoverageBlock),
    ];

    return appointments.filter((a) => {
      const coverage = toCoverage(a);
      return (
        CANCELLABLE.has(a.status) &&
        finalBlocks.some((block) => blockCovers(block, coverage))
      );
    });
  }

  private async holidayImpact(
    actor: AuthenticatedUser,
    query: RestrictionImpactQueryDto,
  ): Promise<ImpactAppointmentRow[]> {
    const clinicId = await this.resolveHolidayClinic(actor, query.clinicId);
    const draft: CoverageHoliday = { date: query.startDate, clinicId };

    const found = query.excludeRestrictionId
      ? await this.repository.findHoliday(query.excludeRestrictionId)
      : null;
    // El personal con sede solo edita feriados de su sede.
    const excluded =
      found && (isGlobalAdmin(actor) || found.clinicId === clinicId)
        ? found
        : null;
    const from = minDay(day(query.startDate), excluded?.date);
    const to = maxDay(day(query.startDate), excluded?.date);

    const [appointments, holidays] = await Promise.all([
      this.repository.findAppointments(
        clinicId === null ? { allClinics: true } : { clinicId },
        from,
        to,
      ),
      this.repository.findHolidays(from, to),
    ]);
    const finalHolidays = [
      draft,
      ...holidays
        .filter((h) => h.id !== excluded?.id)
        .map((h) => ({ date: dayKey(h.date), clinicId: h.clinicId })),
    ];

    return appointments.filter((a) => {
      const coverage = toCoverage(a);
      return (
        CANCELLABLE.has(a.status) &&
        finalHolidays.some((h) => holidayCovers(h, coverage))
      );
    });
  }

  /**
   * Sede del feriado, con la misma regla que `CreateHolidayUseCase`: para el
   * personal con sede vale la del JWT; un administrador global elige una sede
   * o ninguna (feriado global).
   */
  private async resolveHolidayClinic(
    actor: AuthenticatedUser,
    clinicId: number | undefined,
  ): Promise<number | null> {
    if (isGlobalAdmin(actor)) {
      if (clinicId === undefined) return null;
      if (!(await this.lookups.clinicExists(clinicId))) {
        throw new NotFoundException('Sede no encontrada');
      }
      return clinicId;
    }
    if (actor.roleName === 'DOCTOR' || actor.roleName === 'PATIENT') {
      throw new ForbiddenException('No gestionas feriados');
    }
    if (actor.clinicId === null) {
      throw new ForbiddenException('No tienes una sede asignada');
    }
    if (clinicId !== undefined && clinicId !== actor.clinicId) {
      throw new ForbiddenException('No puede consultar feriados de otra sede');
    }
    return actor.clinicId;
  }
}

/** Combinaciones de parámetros que el DTO no puede expresar. */
function validate(query: RestrictionImpactQueryDto): void {
  const fail = (message: string) => {
    throw new BadRequestException(message);
  };
  const start = parseDay(query.startDate, 'startDate');
  const end = parseDay(query.endDate, 'endDate');
  if (end < start) fail('endDate no puede ser anterior a startDate');
  if ((end.getTime() - start.getTime()) / DAY_MS + 1 > MAX_RANGE_DAYS) {
    fail(`El rango no puede superar ${MAX_RANGE_DAYS} días`);
  }

  const hasTimes = query.timeFrom !== undefined || query.timeTo !== undefined;
  if (query.type === 'HOLIDAY') {
    if (query.doctorId !== undefined) fail('Un feriado no lleva doctorId');
    if (query.startDate !== query.endDate) {
      fail('Un feriado es de un solo día: startDate y endDate deben coincidir');
    }
    if (hasTimes) fail('Un feriado no lleva horas');
    return;
  }

  if (query.doctorId === undefined)
    fail('Un bloqueo de agenda requiere doctorId');
  if (query.clinicId !== undefined) {
    fail('Un bloqueo de agenda toma la sede del médico: no lleva clinicId');
  }
  if (query.type === 'FULL_DAY' && hasTimes) {
    fail('Un bloqueo de día completo no lleva horas');
  }
  if (query.type === 'TIME_RANGE') {
    if (!query.timeFrom || !query.timeTo) {
      fail('Un bloqueo por horas requiere timeFrom y timeTo');
    } else if (query.timeFrom >= query.timeTo) {
      fail('timeFrom debe ser anterior a timeTo');
    }
  }
}

/** Día de agenda (medianoche UTC); rechaza fechas que no existen, como 2026-02-30. */
function parseDay(value: string, field: string): Date {
  const date = day(value);
  if (Number.isNaN(date.getTime()) || dayKey(date) !== value) {
    throw new BadRequestException(`${field} no es una fecha válida`);
  }
  return date;
}

function respond(
  affected: ImpactAppointmentRow[],
): RestrictionImpactResponseDto {
  const rows = affected
    .map((a) => ({ a, coverage: toCoverage(a) }))
    .sort(
      (x, y) =>
        x.coverage.date.localeCompare(y.coverage.date) ||
        x.coverage.startTime.localeCompare(y.coverage.startTime) ||
        x.a.id - y.a.id,
    );

  return {
    total: rows.length,
    withPayment: rows.filter(({ a }) => WITH_PAYMENT.has(a.paymentStatus))
      .length,
    appointments: rows.map(({ a, coverage }) => ({
      id: a.id,
      doctorId: a.doctorId,
      doctorName: `${a.doctor.name} ${a.doctor.lastName}`,
      specialtyName: a.specialtyName,
      date: coverage.date,
      startTime: coverage.startTime,
      endTime: coverage.endTime,
      status: a.status,
      paymentStatus: a.paymentStatus,
      patient: {
        id: a.patient.id,
        fullName: `${a.patient.name} ${a.patient.lastName}`,
      },
    })),
  };
}
