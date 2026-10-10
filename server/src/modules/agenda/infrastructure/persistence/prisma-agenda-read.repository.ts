import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service.js';
import type { AppointmentStatus } from '../../../../shared/domain/enums/appointment-status.enum.js';
import type { ScheduleBlockType } from '../../../../shared/domain/enums/schedule-block-type.enum.js';
import { utcDayRange } from '../../../../shared/utils/date-time.utils.js';
import type {
  AgendaRows,
  IAgendaReadRepository,
} from '../../domain/repositories/agenda-read.repository.js';
import type {
  AgendaDoctorRef,
  AgendaScope,
} from '../../domain/services/agenda-scope.policy.js';

/**
 * Lectura de la agenda con predicados de sede explícitos sobre `this.prisma`
 * (no `prisma.tenant`): con un SUPER_ADMIN no hay sede en el contexto y el
 * cliente tenant-aware no filtraría nada, en particular los feriados de otras
 * sedes.
 */
@Injectable()
export class PrismaAgendaReadRepository implements IAgendaReadRepository {
  constructor(private readonly prisma: PrismaService) {}

  findDoctor(doctorId: number): Promise<AgendaDoctorRef | null> {
    return this.prisma.doctors.findFirst({
      where: { id: doctorId, deleted: false },
      select: { id: true, clinicId: true },
    });
  }

  findDoctorByUserId(userId: number): Promise<AgendaDoctorRef | null> {
    return this.prisma.doctors.findFirst({
      where: { deleted: false, profile: { userId, deleted: false } },
      select: { id: true, clinicId: true },
    });
  }

  async clinicExists(clinicId: number): Promise<boolean> {
    const count = await this.prisma.clinics.count({
      where: { id: clinicId, deleted: false },
    });
    return count > 0;
  }

  async load(scope: AgendaScope, from: Date, to: Date): Promise<AgendaRows> {
    const doctor: Prisma.DoctorsWhereInput =
      scope.kind === 'doctor'
        ? { id: scope.doctorId }
        : { clinicId: scope.clinicId, deleted: false };
    const days = { gte: utcDayRange(from).start, lt: utcDayRange(to).end };

    const [clinic, doctors, schedules, appointments, blocks, holidays] =
      await Promise.all([
        scope.clinicId === null
          ? null
          : this.prisma.clinics.findUnique({
              where: { id: scope.clinicId },
              select: { timezone: true },
            }),
        this.prisma.doctors.findMany({
          where: doctor,
          select: {
            id: true,
            profile: { select: { name: true, lastName: true } },
            specialties: {
              where: { deleted: false, specialty: { deleted: false } },
              select: { specialty: { select: { id: true, name: true } } },
              orderBy: { specialtyId: 'asc' },
            },
          },
          orderBy: { id: 'asc' },
        }),
        this.prisma.schedules.findMany({
          where: { scheduleDate: days, doctor },
          select: {
            id: true,
            doctorId: true,
            specialtyId: true,
            scheduleDate: true,
            timeFrom: true,
            timeTo: true,
            specialty: { select: { duration: true, bufferMinutes: true } },
          },
          orderBy: [
            { scheduleDate: 'asc' },
            { timeFrom: 'asc' },
            { doctorId: 'asc' },
          ],
        }),
        this.prisma.appointments.findMany({
          where: { deleted: false, schedule: { scheduleDate: days, doctor } },
          select: {
            id: true,
            scheduleId: true,
            startTime: true,
            endTime: true,
            status: true,
            paymentStatus: true,
            isOverbook: true,
            isAtRisk: true,
            pendingUntil: true,
            schedule: {
              select: { doctorId: true, specialtyId: true, scheduleDate: true },
            },
            // Solo identificación: la agenda no expone contacto del paciente.
            patient: {
              select: {
                id: true,
                profile: { select: { name: true, lastName: true } },
              },
            },
          },
          orderBy: [
            { schedule: { scheduleDate: 'asc' } },
            { startTime: 'asc' },
          ],
        }),
        this.prisma.scheduleBlocks.findMany({
          where: {
            isActive: true,
            startDate: { lt: days.lt },
            endDate: { gte: days.gte },
            doctor,
          },
          select: {
            id: true,
            doctorId: true,
            type: true,
            startDate: true,
            endDate: true,
            timeFrom: true,
            timeTo: true,
            reason: true,
          },
          orderBy: [{ startDate: 'asc' }, { id: 'asc' }],
        }),
        this.prisma.holidays.findMany({
          where: {
            isActive: true,
            date: days,
            OR: [
              { clinicId: null },
              ...(scope.clinicId === null
                ? []
                : [{ clinicId: scope.clinicId }]),
            ],
          },
          select: { id: true, date: true, name: true, clinicId: true },
          orderBy: [{ date: 'asc' }, { id: 'asc' }],
        }),
      ]);

    return {
      timezone: clinic?.timezone ?? 'America/Lima',
      doctors: doctors.map((d) => ({
        id: d.id,
        name: d.profile.name,
        lastName: d.profile.lastName,
        specialties: d.specialties.map((link) => link.specialty),
      })),
      schedules: schedules.map(({ specialty, ...schedule }) => ({
        ...schedule,
        durationMinutes: specialty.duration,
        bufferMinutes: specialty.bufferMinutes ?? 0,
      })),
      appointments: appointments.map(({ schedule, patient, ...a }) => ({
        ...a,
        status: a.status as AppointmentStatus,
        doctorId: schedule.doctorId,
        specialtyId: schedule.specialtyId,
        scheduleDate: schedule.scheduleDate,
        patient: {
          id: patient.id,
          name: patient.profile.name,
          lastName: patient.profile.lastName,
        },
      })),
      blocks: blocks.map((block) => ({
        ...block,
        type: block.type as ScheduleBlockType,
      })),
      holidays,
    };
  }
}
