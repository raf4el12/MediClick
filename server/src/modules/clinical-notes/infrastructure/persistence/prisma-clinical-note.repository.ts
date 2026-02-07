import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service.js';
import { IClinicalNoteRepository } from '../../domain/repositories/clinical-note.repository.js';
import {
  CreateClinicalNoteData,
  ClinicalNoteWithAppointment,
} from '../../domain/interfaces/clinical-note-data.interface.js';

const clinicalNoteInclude = {
  appointment: {
    select: {
      id: true,
      status: true,
      patient: {
        select: {
          id: true,
          profile: { select: { name: true, lastName: true } },
        },
      },
      schedule: {
        select: {
          scheduleDate: true,
          doctor: {
            select: {
              id: true,
              profile: { select: { name: true, lastName: true } },
            },
          },
        },
      },
    },
  },
} as const;

@Injectable()
export class PrismaClinicalNoteRepository implements IClinicalNoteRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateClinicalNoteData): Promise<ClinicalNoteWithAppointment> {
    return this.prisma.clinicalNotes.create({
      data: {
        appointmentId: data.appointmentId,
        summary: data.summary,
        diagnosis: data.diagnosis,
        plan: data.plan,
      },
      include: clinicalNoteInclude,
    }) as any;
  }

  async findByAppointmentId(
    appointmentId: number,
  ): Promise<ClinicalNoteWithAppointment[]> {
    return this.prisma.clinicalNotes.findMany({
      where: { appointmentId, deleted: false },
      include: clinicalNoteInclude,
      orderBy: { createdAt: 'desc' },
    }) as any;
  }

  async findAppointmentDoctorId(appointmentId: number): Promise<number | null> {
    const appointment = await this.prisma.appointments.findUnique({
      where: { id: appointmentId },
      select: {
        schedule: { select: { doctorId: true } },
      },
    });
    return appointment?.schedule?.doctorId ?? null;
  }
}
