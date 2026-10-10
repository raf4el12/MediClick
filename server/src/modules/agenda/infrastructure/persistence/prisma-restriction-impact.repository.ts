import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service.js';
import type { AppointmentStatus } from '../../../../shared/domain/enums/appointment-status.enum.js';
import type { ScheduleBlockType } from '../../../../shared/domain/enums/schedule-block-type.enum.js';
import { utcDayRange } from '../../../../shared/utils/date-time.utils.js';
import type {
  ImpactAppointmentFilter,
  ImpactAppointmentRow,
  ImpactBlockRow,
  IRestrictionImpactRepository,
} from '../../domain/repositories/restriction-impact.repository.js';

const blockSelect = {
  id: true,
  type: true,
  startDate: true,
  endDate: true,
  timeFrom: true,
  timeTo: true,
} satisfies Prisma.ScheduleBlocksSelect;

const toBlock = (
  block: Prisma.ScheduleBlocksGetPayload<{ select: typeof blockSelect }>,
): ImpactBlockRow => ({
  ...block,
  type: block.type as ScheduleBlockType,
});

/**
 * Lecturas de la vista previa de impacto con predicados explícitos sobre
 * `this.prisma` (no `prisma.tenant`), como la agenda: el alcance ya lo resolvió
 * el caso de uso y un SUPER_ADMIN no tiene sede en el contexto.
 */
@Injectable()
export class PrismaRestrictionImpactRepository implements IRestrictionImpactRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAppointments(
    filter: ImpactAppointmentFilter,
    from: Date,
    to: Date,
  ): Promise<ImpactAppointmentRow[]> {
    // Mismo filtro que `findActiveByDoctorAndDateRange` y
    // `findActiveByDateRangeAndClinic` del listener (sede por `appointments.clinicId`).
    const where: Prisma.AppointmentsWhereInput = {
      deleted: false,
      schedule: {
        scheduleDate: { gte: utcDayRange(from).start, lt: utcDayRange(to).end },
        ...('doctorId' in filter && { doctorId: filter.doctorId }),
      },
      ...('clinicId' in filter && { clinicId: filter.clinicId }),
    };

    const rows = await this.prisma.appointments.findMany({
      where,
      select: {
        id: true,
        clinicId: true,
        startTime: true,
        endTime: true,
        status: true,
        paymentStatus: true,
        schedule: {
          select: {
            scheduleDate: true,
            specialty: { select: { name: true } },
            doctor: {
              select: {
                id: true,
                clinicId: true,
                profile: { select: { name: true, lastName: true } },
              },
            },
          },
        },
        // Solo identificación: la vista previa no expone contacto del paciente.
        patient: {
          select: {
            id: true,
            profile: { select: { name: true, lastName: true } },
          },
        },
      },
    });

    return rows.map((row) => ({
      id: row.id,
      doctorId: row.schedule.doctor.id,
      doctor: row.schedule.doctor.profile,
      specialtyName: row.schedule.specialty.name,
      clinicId: row.clinicId ?? row.schedule.doctor.clinicId,
      scheduleDate: row.schedule.scheduleDate,
      startTime: row.startTime,
      endTime: row.endTime,
      status: row.status as AppointmentStatus,
      paymentStatus: row.paymentStatus,
      patient: {
        id: row.patient.id,
        name: row.patient.profile.name,
        lastName: row.patient.profile.lastName,
      },
    }));
  }

  async findBlocks(
    doctorId: number,
    from: Date,
    to: Date,
  ): Promise<ImpactBlockRow[]> {
    const blocks = await this.prisma.scheduleBlocks.findMany({
      where: {
        doctorId,
        isActive: true,
        startDate: { lt: utcDayRange(to).end },
        endDate: { gte: utcDayRange(from).start },
      },
      select: blockSelect,
    });
    return blocks.map(toBlock);
  }

  async findBlock(
    blockId: number,
    doctorId: number,
  ): Promise<ImpactBlockRow | null> {
    const block = await this.prisma.scheduleBlocks.findFirst({
      where: { id: blockId, doctorId, isActive: true },
      select: blockSelect,
    });
    return block ? toBlock(block) : null;
  }

  findHolidays(from: Date, to: Date) {
    return this.prisma.holidays.findMany({
      where: {
        isActive: true,
        date: { gte: utcDayRange(from).start, lt: utcDayRange(to).end },
      },
      select: { id: true, date: true, clinicId: true },
    });
  }

  findHoliday(holidayId: number) {
    return this.prisma.holidays.findFirst({
      where: { id: holidayId, isActive: true },
      select: { id: true, date: true, clinicId: true },
    });
  }
}
