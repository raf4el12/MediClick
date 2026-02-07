import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service.js';
import { IAppointmentRepository } from '../../domain/repositories/appointment.repository.js';
import {
  CreateAppointmentData,
  UpdateAppointmentData,
  AppointmentWithRelations,
  DashboardFilters,
} from '../../domain/interfaces/appointment-data.interface.js';
import { PaginationParams } from '../../../../shared/domain/interfaces/pagination-params.interface.js';
import { PaginatedResult } from '../../../../shared/domain/interfaces/paginated-result.interface.js';
import { AppointmentStatus } from '../../../../shared/domain/enums/appointment-status.enum.js';

const appointmentInclude = {
  patient: {
    select: {
      id: true,
      profile: { select: { name: true, lastName: true, email: true } },
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
          profile: { select: { name: true, lastName: true } },
        },
      },
      specialty: { select: { id: true, name: true } },
    },
  },
} as const;

@Injectable()
export class PrismaAppointmentRepository implements IAppointmentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateAppointmentData): Promise<AppointmentWithRelations> {
    const result = await this.prisma.appointments.create({
      data: {
        patientId: data.patientId,
        scheduleId: data.scheduleId,
        reason: data.reason,
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

    const where: any = {
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
          ...((filters.specialtyId && { specialtyId: filters.specialtyId }) || {}),
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
      this.prisma.appointments.findMany({
        where,
        include: appointmentInclude,
        skip: offset,
        take: limit,
        orderBy: { [orderBy || 'createdAt']: orderByMode || 'desc' },
      }),
      this.prisma.appointments.count({ where }),
    ]);

    return {
      totalRows: count,
      rows: rows.map((r) => this.mapToRelations(r)),
      totalPages: Math.ceil(count / limit),
      currentPage: Math.floor(offset / limit) + 1,
    };
  }

  async findById(id: number): Promise<AppointmentWithRelations | null> {
    const result = await this.prisma.appointments.findFirst({
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
        ...(data.cancelReason !== undefined && { cancelReason: data.cancelReason }),
        ...(data.scheduleId && { scheduleId: data.scheduleId }),
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

  async findByDoctorAndDate(
    doctorId: number,
    date: Date,
  ): Promise<AppointmentWithRelations[]> {
    const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);

    const rows = await this.prisma.appointments.findMany({
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

  private mapToRelations(raw: any): AppointmentWithRelations {
    return {
      id: raw.id,
      patientId: raw.patientId,
      scheduleId: raw.scheduleId,
      reason: raw.reason,
      notes: raw.notes,
      status: raw.status as AppointmentStatus,
      paymentStatus: raw.paymentStatus,
      amount: raw.amount ? Number(raw.amount) : null,
      cancelReason: raw.cancelReason,
      deleted: raw.deleted,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      patient: raw.patient,
      schedule: raw.schedule,
    };
  }
}
