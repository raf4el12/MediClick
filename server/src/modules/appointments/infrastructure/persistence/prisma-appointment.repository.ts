import { randomUUID } from 'node:crypto';
import { Injectable, ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service.js';
import { IAppointmentRepository } from '../../domain/repositories/appointment.repository.js';
import type {
  CreateAppointmentData,
  UpdateAppointmentData,
  AppointmentWithRelations,
  DashboardFilters,
  PatientAppointmentFilters,
  ExpiredAppointmentSlot,
  DurableOperationIdentity,
  RescheduleEventIdentity,
  CancelAppointmentAtomicallyData,
  CancelAppointmentAtomicallyResult,
  AppointmentChangedEventIdentity,
} from '../../domain/interfaces/appointment-data.interface.js';
import { PaginationParams } from '../../../../shared/domain/interfaces/pagination-params.interface.js';
import { PaginatedResult } from '../../../../shared/domain/interfaces/paginated-result.interface.js';
import { AppointmentStatus } from '../../../../shared/domain/enums/appointment-status.enum.js';
import {
  utcDayRange,
  todayStartInTimezone,
} from '../../../../shared/utils/date-time.utils.js';
import { DEFAULT_TIMEZONE } from '../../../../shared/constants/defaults.constant.js';
import {
  buildDoctorOverlapWhere,
  buildPatientOverlapWhere,
} from './appointment-overlap.utils.js';
import { recordOutboxEvent } from '../../../../shared/outbox/infrastructure/prisma-outbox-writer.js';
import {
  APPOINTMENT_CANCELLED,
  APPOINTMENT_CONFIRMED,
  buildAppointmentChangedDurableEvent,
  buildAppointmentSlotReleasedDurableEvent,
} from '../../../../shared/events/appointment-durable-events.js';

const appointmentInclude = {
  patient: {
    select: {
      id: true,
      profile: {
        select: {
          name: true,
          lastName: true,
          userId: true,
          user: { select: { email: true } },
        },
      },
    },
  },
  schedule: {
    select: {
      id: true,
      scheduleDate: true,
      timeFrom: true,
      timeTo: true,
      doctor: {
        select: {
          id: true,
          profile: { select: { name: true, lastName: true, userId: true } },
          clinic: { select: { id: true, name: true, timezone: true } },
        },
      },
      specialty: { select: { id: true, name: true } },
    },
  },
  prescription: { select: { id: true } },
  _count: { select: { clinicalNotes: true } },
} as const;

type AppointmentRow = Prisma.AppointmentsGetPayload<{
  include: typeof appointmentInclude;
}>;

@Injectable()
export class PrismaAppointmentRepository implements IAppointmentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateAppointmentData): Promise<AppointmentWithRelations> {
    const result = await this.prisma.appointments.create({
      data: {
        patientId: data.patientId,
        scheduleId: data.scheduleId,
        startTime: data.startTime,
        endTime: data.endTime,
        reason: data.reason,
        ...(data.isOverbook && { isOverbook: true }),
        clinicId: data.clinicId ?? null,
      },
      include: appointmentInclude,
    });
    return this.mapToRelations(result);
  }

  async findAllPaginated(
    params: PaginationParams,
    filters: DashboardFilters,
  ): Promise<PaginatedResult<AppointmentWithRelations>> {
    const { limit, offset, searchValue, orderBy, orderByMode } = params;

    const where: Prisma.AppointmentsWhereInput = {
      deleted: false,
      ...(filters.status && { status: filters.status }),
      ...(filters.doctorId && {
        schedule: { doctorId: filters.doctorId },
      }),
      ...(filters.specialtyId && {
        schedule: {
          ...((filters.doctorId && { doctorId: filters.doctorId }) || {}),
          specialtyId: filters.specialtyId,
        },
      }),
      ...((filters.dateFrom || filters.dateTo) && {
        schedule: {
          ...((filters.doctorId && { doctorId: filters.doctorId }) || {}),
          ...((filters.specialtyId && { specialtyId: filters.specialtyId }) ||
            {}),
          scheduleDate: {
            ...(filters.dateFrom && { gte: filters.dateFrom }),
            ...(filters.dateTo && { lte: filters.dateTo }),
          },
        },
      }),
      ...(searchValue && {
        OR: [
          {
            patient: {
              profile: {
                name: { contains: searchValue, mode: 'insensitive' },
              },
            },
          },
          {
            patient: {
              profile: {
                lastName: { contains: searchValue, mode: 'insensitive' },
              },
            },
          },
        ],
      }),
    };

    const [rows, count] = await Promise.all([
      this.prisma.tenant.appointments.findMany({
        where,
        include: appointmentInclude,
        skip: offset,
        take: limit,
        orderBy: { [orderBy || 'createdAt']: orderByMode || 'desc' },
      }),
      this.prisma.tenant.appointments.count({ where }),
    ]);

    return {
      totalRows: count,
      rows: rows.map((r) => this.mapToRelations(r)),
      totalPages: Math.ceil(count / limit),
      currentPage: Math.floor(offset / limit) + 1,
    };
  }

  async findByPatientPaginated(
    patientId: number,
    params: PaginationParams,
    filters: PatientAppointmentFilters,
  ): Promise<PaginatedResult<AppointmentWithRelations>> {
    const { limit, offset, orderBy, orderByMode } = params;

    const where: Prisma.AppointmentsWhereInput = {
      patientId,
      deleted: false,
      ...(filters.status && { status: filters.status }),
      ...(filters.upcoming && {
        schedule: {
          scheduleDate: {
            gte: todayStartInTimezone(filters.timezone ?? DEFAULT_TIMEZONE),
          },
        },
        status: filters.status || { notIn: ['CANCELLED', 'NO_SHOW'] },
      }),
    };

    const [rows, count] = await Promise.all([
      this.prisma.tenant.appointments.findMany({
        where,
        include: appointmentInclude,
        skip: offset,
        take: limit,
        orderBy: { [orderBy || 'createdAt']: orderByMode || 'desc' },
      }),
      this.prisma.tenant.appointments.count({ where }),
    ]);

    return {
      totalRows: count,
      rows: rows.map((r) => this.mapToRelations(r)),
      totalPages: Math.ceil(count / limit),
      currentPage: Math.floor(offset / limit) + 1,
    };
  }

  async findById(id: number): Promise<AppointmentWithRelations | null> {
    const result = await this.prisma.tenant.appointments.findFirst({
      where: { id, deleted: false },
      include: appointmentInclude,
    });
    return result ? this.mapToRelations(result) : null;
  }

  async update(
    id: number,
    data: UpdateAppointmentData,
  ): Promise<AppointmentWithRelations> {
    const result = await this.prisma.appointments.update({
      where: { id },
      data: {
        ...(data.status && { status: data.status }),
        ...(data.cancelReason !== undefined && {
          cancelReason: data.cancelReason,
        }),
        ...(data.cancellationFee !== undefined && {
          cancellationFee: data.cancellationFee,
        }),
        ...(data.scheduleId && { scheduleId: data.scheduleId }),
        ...(data.startTime && { startTime: data.startTime }),
        ...(data.endTime && { endTime: data.endTime }),
        ...(data.notes !== undefined && { notes: data.notes }),
        updatedAt: data.updatedAt ?? new Date(),
      },
      include: appointmentInclude,
    });
    return this.mapToRelations(result);
  }

  async softDelete(id: number): Promise<void> {
    await this.prisma.appointments.update({
      where: { id },
      data: { deleted: true, updatedAt: new Date() },
    });
  }

  async existsAppointmentForSchedule(
    scheduleId: number,
    excludeId?: number,
  ): Promise<boolean> {
    const count = await this.prisma.appointments.count({
      where: {
        scheduleId,
        deleted: false,
        status: { notIn: ['CANCELLED'] },
        ...(excludeId && { id: { not: excludeId } }),
      },
    });
    return count > 0;
  }

  async hasOverlappingAppointment(
    scheduleId: number,
    startTime: Date,
    endTime: Date,
    excludeId?: number,
  ): Promise<boolean> {
    const schedule = await this.prisma.schedules.findUnique({
      where: { id: scheduleId },
      select: { doctorId: true, scheduleDate: true },
    });
    if (!schedule) return false;

    const count = await this.prisma.appointments.count({
      where: buildDoctorOverlapWhere(
        schedule.doctorId,
        schedule.scheduleDate,
        startTime,
        endTime,
        excludeId,
      ),
    });
    return count > 0;
  }

  async findByDoctorAndDate(
    doctorId: number,
    date: Date,
  ): Promise<AppointmentWithRelations[]> {
    const { start: startOfDay, end: endOfDay } = utcDayRange(date);

    const rows = await this.prisma.tenant.appointments.findMany({
      where: {
        deleted: false,
        schedule: {
          doctorId,
          scheduleDate: { gte: startOfDay, lt: endOfDay },
        },
      },
      include: appointmentInclude,
      orderBy: { schedule: { timeFrom: 'asc' } },
    });

    return rows.map((r) => this.mapToRelations(r));
  }

  async findActiveByDoctorAndDateRange(
    doctorId: number,
    dateFrom: Date,
    dateTo: Date,
  ): Promise<AppointmentWithRelations[]> {
    const { start } = utcDayRange(dateFrom);
    const { end } = utcDayRange(dateTo);

    const rows = await this.prisma.appointments.findMany({
      where: {
        deleted: false,
        status: { notIn: ['CANCELLED', 'NO_SHOW'] },
        schedule: {
          doctorId,
          scheduleDate: { gte: start, lt: end },
        },
      },
      include: appointmentInclude,
    });

    return rows.map((r) => this.mapToRelations(r));
  }

  async findActiveByDateRangeAndClinic(
    dateFrom: Date,
    dateTo: Date,
    clinicId?: number | null,
  ): Promise<AppointmentWithRelations[]> {
    const { start } = utcDayRange(dateFrom);
    const { end } = utcDayRange(dateTo);

    const rows = await this.prisma.appointments.findMany({
      where: {
        deleted: false,
        status: { notIn: ['CANCELLED', 'NO_SHOW'] },
        ...(clinicId != null && { clinicId }),
        schedule: {
          scheduleDate: { gte: start, lt: end },
        },
      },
      include: appointmentInclude,
    });

    return rows.map((r) => this.mapToRelations(r));
  }

  async countOverbooksByDoctorAndDate(
    doctorId: number,
    date: Date,
  ): Promise<number> {
    const { start: startOfDay, end: endOfDay } = utcDayRange(date);

    return this.prisma.tenant.appointments.count({
      where: {
        deleted: false,
        isOverbook: true,
        status: { notIn: ['CANCELLED', 'NO_SHOW'] },
        schedule: {
          doctorId,
          scheduleDate: { gte: startOfDay, lt: endOfDay },
        },
      },
    });
  }

  async createWithOverlapCheck(
    data: CreateAppointmentData,
    startTime: Date,
    endTime: Date,
  ): Promise<AppointmentWithRelations> {
    return this.prisma.$transaction(
      async (tx) => {
        const schedule = await tx.schedules.findUnique({
          where: { id: data.scheduleId },
          select: { doctorId: true, scheduleDate: true },
        });
        if (!schedule) {
          throw new ConflictException('El horario especificado ya no existe');
        }

        const overlap = await tx.appointments.count({
          where: buildDoctorOverlapWhere(
            schedule.doctorId,
            schedule.scheduleDate,
            startTime,
            endTime,
          ),
        });

        if (overlap > 0) {
          throw new ConflictException(
            'Ya existe una cita que se superpone con el horario seleccionado',
          );
        }

        const patientOverlap = await tx.appointments.count({
          where: buildPatientOverlapWhere(
            data.patientId,
            schedule.scheduleDate,
            startTime,
            endTime,
          ),
        });

        if (patientOverlap > 0) {
          throw new ConflictException(
            'El paciente ya tiene otra cita que se superpone en ese horario',
          );
        }

        const result = await tx.appointments.create({
          data: {
            patientId: data.patientId,
            scheduleId: data.scheduleId,
            startTime: data.startTime,
            endTime: data.endTime,
            reason: data.reason,
            ...(data.isOverbook && { isOverbook: true }),
            ...(data.amount != null && { amount: data.amount }),
            ...(data.pendingUntil != null && {
              pendingUntil: data.pendingUntil,
            }),
            clinicId: data.clinicId ?? null,
          },
          include: appointmentInclude,
        });

        return this.mapToRelations(result);
      },
      { isolationLevel: 'Serializable' },
    );
  }

  async rescheduleWithOverlapCheck(
    id: number,
    data: UpdateAppointmentData,
    newScheduleId: number,
    startTime: Date,
    endTime: Date,
    eventIdentity: RescheduleEventIdentity,
  ): Promise<AppointmentWithRelations> {
    return this.prisma.$transaction(
      async (tx) => {
        const schedule = await tx.schedules.findUnique({
          where: { id: newScheduleId },
          select: { doctorId: true, scheduleDate: true },
        });
        if (!schedule) {
          throw new ConflictException('El horario especificado ya no existe');
        }

        const overlap = await tx.appointments.count({
          where: buildDoctorOverlapWhere(
            schedule.doctorId,
            schedule.scheduleDate,
            startTime,
            endTime,
            id,
          ),
        });

        if (overlap > 0) {
          throw new ConflictException(
            'Ya existe una cita que se superpone con el horario seleccionado',
          );
        }

        const current = await tx.appointments.findUnique({
          where: { id },
          select: {
            patientId: true,
            scheduleId: true,
            startTime: true,
            endTime: true,
            clinicId: true,
            schedule: {
              select: { doctor: { select: { clinicId: true } } },
            },
          },
        });
        if (!current) {
          throw new ConflictException('La cita ya no existe');
        }

        const patientOverlap = await tx.appointments.count({
          where: buildPatientOverlapWhere(
            current.patientId,
            schedule.scheduleDate,
            startTime,
            endTime,
            id,
          ),
        });

        if (patientOverlap > 0) {
          throw new ConflictException(
            'El paciente ya tiene otra cita que se superpone en ese horario',
          );
        }

        const result = await tx.appointments.update({
          where: { id },
          data: {
            ...(data.status && { status: data.status }),
            ...(data.scheduleId && { scheduleId: data.scheduleId }),
            ...(data.startTime && { startTime: data.startTime }),
            ...(data.endTime && { endTime: data.endTime }),
            ...(data.pendingUntil !== undefined && {
              pendingUntil: data.pendingUntil,
            }),
            ...(data.reminderSent !== undefined && {
              reminderSent: data.reminderSent,
            }),
            updatedAt: data.updatedAt ?? new Date(),
          },
          include: appointmentInclude,
        });

        const slotChanged =
          current.scheduleId !== newScheduleId ||
          current.startTime.getTime() !== startTime.getTime() ||
          current.endTime.getTime() !== endTime.getTime();
        if (slotChanged) {
          await recordOutboxEvent(
            tx,
            buildAppointmentSlotReleasedDurableEvent({
              eventId: eventIdentity.slotReleasedEventId,
              operationId: eventIdentity.operationId,
              occurredAt: eventIdentity.occurredAt,
              appointmentId: id,
              scheduleId: current.scheduleId,
              startTime: current.startTime,
              endTime: current.endTime,
              clinicId:
                current.clinicId ?? current.schedule.doctor.clinicId ?? null,
            }),
          );
        }

        return this.mapToRelations(result);
      },
      { isolationLevel: 'Serializable' },
    );
  }

  async expirePendingPastDeadline(
    now: Date,
    eventIdentity: DurableOperationIdentity,
  ): Promise<ExpiredAppointmentSlot[]> {
    return this.prisma.$transaction(async (tx) => {
      const expired = await tx.appointments.updateManyAndReturn({
        where: {
          status: 'PENDING',
          // Incluye FAILED: el paciente puede reintentar hasta el deadline,
          // pero después ambos estados financieros dejan de retener el cupo.
          paymentStatus: { in: ['PENDING', 'FAILED'] },
          pendingUntil: { lt: now },
          deleted: false,
        },
        data: {
          status: 'CANCELLED',
          cancelReason: 'Pago no completado dentro del tiempo permitido',
          updatedAt: now,
        },
        select: {
          id: true,
          scheduleId: true,
          startTime: true,
          endTime: true,
          clinicId: true,
        },
      });

      const scheduleIdsWithoutClinic = expired
        .filter((slot) => slot.clinicId === null)
        .map((slot) => slot.scheduleId);
      const scheduleClinics =
        scheduleIdsWithoutClinic.length === 0
          ? []
          : await tx.schedules.findMany({
              where: { id: { in: scheduleIdsWithoutClinic } },
              select: {
                id: true,
                clinicId: true,
                doctor: { select: { clinicId: true } },
              },
            });
      const clinicBySchedule = new Map(
        scheduleClinics.map((schedule) => [
          schedule.id,
          schedule.clinicId ?? schedule.doctor.clinicId ?? null,
        ]),
      );
      const scopedExpired = expired.map((slot) => ({
        ...slot,
        clinicId:
          slot.clinicId ?? clinicBySchedule.get(slot.scheduleId) ?? null,
      }));

      for (const slot of scopedExpired) {
        await recordOutboxEvent(
          tx,
          buildAppointmentSlotReleasedDurableEvent({
            eventId: randomUUID(),
            operationId: `${eventIdentity.operationId}:${slot.id}`,
            occurredAt: eventIdentity.occurredAt,
            appointmentId: slot.id,
            scheduleId: slot.scheduleId,
            startTime: slot.startTime,
            endTime: slot.endTime,
            clinicId: slot.clinicId,
          }),
        );
      }

      return scopedExpired;
    });
  }

  async cancelAtomically(
    data: CancelAppointmentAtomicallyData,
  ): Promise<CancelAppointmentAtomicallyResult> {
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.appointments.findFirst({
        where: { id: data.appointmentId, deleted: false },
        include: appointmentInclude,
      });
      if (!current) {
        throw new ConflictException('La cita ya no existe');
      }

      if (current.status === 'CANCELLED') {
        return {
          appointment: this.mapToRelations(current),
          refundReviewTransactionId: null,
          transitioned: false,
        };
      }

      const updated = await tx.appointments.update({
        where: { id: data.appointmentId },
        data: {
          status: AppointmentStatus.CANCELLED,
          cancelReason: data.reason,
          ...(data.cancellationFee !== undefined && {
            cancellationFee: data.cancellationFee,
          }),
          updatedAt: data.eventIdentity.occurredAt,
        },
        include: appointmentInclude,
      });

      const paidTransaction = await tx.transactions.findFirst({
        where: { appointmentId: data.appointmentId, status: 'PAID' },
        orderBy: { createdAt: 'desc' },
      });
      if (paidTransaction) {
        const previousMetadata =
          paidTransaction.metadata &&
          typeof paidTransaction.metadata === 'object' &&
          !Array.isArray(paidTransaction.metadata)
            ? (paidTransaction.metadata as Record<string, unknown>)
            : {};
        const occurredAt = data.eventIdentity.occurredAt.toISOString();
        await tx.transactions.update({
          where: { id: paidTransaction.id },
          data: {
            metadata: {
              ...previousMetadata,
              needsRefund: true,
              refundRequestedAt: occurredAt,
              refundCancelReason: data.reason,
              refundCancelledBy: data.cancelledBy,
              ...(data.cancellationFee !== undefined && {
                needsFeeCollection: true,
                feeAmount: data.cancellationFee,
                feeReason: 'Cancelación tardía (<24h)',
                feeRequestedAt: occurredAt,
              }),
            } as Prisma.InputJsonValue,
            updatedAt: data.eventIdentity.occurredAt,
          },
        });
      }

      const appointment = this.mapToRelations(updated);
      const clinicId =
        appointment.clinicId ?? appointment.schedule.doctor.clinic?.id ?? null;
      await recordOutboxEvent(
        tx,
        buildAppointmentSlotReleasedDurableEvent({
          eventId: data.eventIdentity.slotReleasedEventId,
          operationId: data.eventIdentity.operationId,
          occurredAt: data.eventIdentity.occurredAt,
          appointmentId: appointment.id,
          scheduleId: appointment.scheduleId,
          startTime: appointment.startTime,
          endTime: appointment.endTime,
          clinicId,
        }),
      );
      await recordOutboxEvent(
        tx,
        buildAppointmentChangedDurableEvent(APPOINTMENT_CANCELLED, {
          eventId: data.eventIdentity.cancelledEventId,
          operationId: data.eventIdentity.operationId,
          occurredAt: data.eventIdentity.occurredAt,
          appointmentId: appointment.id,
          clinicId,
        }),
      );

      return {
        appointment,
        refundReviewTransactionId: paidTransaction?.id ?? null,
        transitioned: true,
      };
    });
  }

  async confirmAtomically(
    id: number,
    eventIdentity: AppointmentChangedEventIdentity,
  ): Promise<AppointmentWithRelations> {
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.appointments.findFirst({
        where: { id, deleted: false },
        select: {
          id: true,
          status: true,
          clinicId: true,
          schedule: { select: { doctor: { select: { clinicId: true } } } },
        },
      });
      if (!current) throw new ConflictException('La cita ya no existe');

      const changed = await tx.appointments.updateMany({
        where: { id, status: 'PENDING', deleted: false },
        data: {
          status: 'CONFIRMED',
          pendingUntil: null,
          updatedAt: eventIdentity.occurredAt,
        },
      });
      if (changed.count !== 1) {
        throw new ConflictException(
          `La cita cambió durante la confirmación: ${current.status}`,
        );
      }

      await recordOutboxEvent(
        tx,
        buildAppointmentChangedDurableEvent(APPOINTMENT_CONFIRMED, {
          eventId: eventIdentity.eventId,
          operationId: eventIdentity.operationId,
          occurredAt: eventIdentity.occurredAt,
          appointmentId: id,
          clinicId:
            current.clinicId ?? current.schedule.doctor.clinicId ?? null,
        }),
      );

      const updated = await tx.appointments.findUniqueOrThrow({
        where: { id },
        include: appointmentInclude,
      });
      return this.mapToRelations(updated);
    });
  }

  async createOverbookAtomic(
    data: CreateAppointmentData,
    doctorId: number,
    date: Date,
    maxOverbookPerDay: number,
  ): Promise<AppointmentWithRelations> {
    const { start: startOfDay, end: endOfDay } = utcDayRange(date);

    return this.prisma.$transaction(
      async (tx) => {
        const currentOverbooks = await tx.appointments.count({
          where: {
            deleted: false,
            isOverbook: true,
            status: { notIn: ['CANCELLED', 'NO_SHOW'] },
            schedule: {
              doctorId,
              scheduleDate: { gte: startOfDay, lt: endOfDay },
            },
          },
        });

        if (currentOverbooks >= maxOverbookPerDay) {
          throw new ConflictException(
            `Se alcanzó el límite de sobrecupos (${maxOverbookPerDay}) para este doctor en esta fecha`,
          );
        }

        const overlap = await tx.appointments.count({
          where: buildDoctorOverlapWhere(
            doctorId,
            date,
            data.startTime,
            data.endTime,
          ),
        });

        if (overlap > 0) {
          throw new ConflictException(
            'Ya existe una cita que se superpone con el horario del sobrecupo',
          );
        }

        const patientOverlap = await tx.appointments.count({
          where: buildPatientOverlapWhere(
            data.patientId,
            date,
            data.startTime,
            data.endTime,
          ),
        });

        if (patientOverlap > 0) {
          throw new ConflictException(
            'El paciente ya tiene otra cita que se superpone en ese horario',
          );
        }

        const result = await tx.appointments.create({
          data: {
            patientId: data.patientId,
            scheduleId: data.scheduleId,
            startTime: data.startTime,
            endTime: data.endTime,
            reason: data.reason,
            isOverbook: true,
            clinicId: data.clinicId ?? null,
          },
          include: appointmentInclude,
        });

        return this.mapToRelations(result);
      },
      { isolationLevel: 'Serializable' },
    );
  }

  private mapToRelations(raw: AppointmentRow): AppointmentWithRelations {
    return {
      id: raw.id,
      patientId: raw.patientId,
      scheduleId: raw.scheduleId,
      startTime: raw.startTime,
      endTime: raw.endTime,
      reason: raw.reason,
      notes: raw.notes,
      status: raw.status as AppointmentStatus,
      paymentStatus: raw.paymentStatus,
      amount: raw.amount === null ? null : Number(raw.amount),
      cancelReason: raw.cancelReason,
      cancellationFee:
        raw.cancellationFee === null ? null : Number(raw.cancellationFee),
      isOverbook: raw.isOverbook,
      pendingUntil: raw.pendingUntil ?? null,
      clinicId: raw.clinicId ?? null,
      deleted: raw.deleted,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      patient: {
        ...raw.patient,
        profile: {
          ...raw.patient.profile,
          email: raw.patient.profile.user?.email ?? '',
        },
      },
      schedule: raw.schedule,
      hasPrescription:
        raw.prescription !== null && raw.prescription !== undefined,
      notesCount: raw._count?.clinicalNotes ?? 0,
    };
  }
}
