import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service.js';
import { IPrescriptionRepository } from '../../domain/repositories/prescription.repository.js';
import {
  CreatePrescriptionData,
  PrescriptionWithItems,
} from '../../domain/interfaces/prescription-data.interface.js';

const prescriptionInclude = {
  items: true,
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
          specialty: { select: { id: true, name: true } },
        },
      },
    },
  },
} as const;

@Injectable()
export class PrismaPrescriptionRepository implements IPrescriptionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createWithAutoComplete(
    data: CreatePrescriptionData,
  ): Promise<PrescriptionWithItems> {
    return this.prisma.$transaction(async (tx) => {
      // 1. Crear la receta con sus items
      const prescription = await tx.prescriptions.create({
        data: {
          appointmentId: data.appointmentId,
          instructions: data.instructions,
          validUntil: data.validUntil,
          items: {
            create: data.items.map((item) => ({
              medication: item.medication,
              dosage: item.dosage,
              frequency: item.frequency,
              duration: item.duration,
              notes: item.notes,
            })),
          },
        },
        include: prescriptionInclude,
      });

      // 2. Auto-completar la cita
      await tx.appointments.update({
        where: { id: data.appointmentId },
        data: {
          status: 'COMPLETED',
          updatedAt: new Date(),
        },
      });

      // 3. Re-leer para obtener estado actualizado
      const updated = await tx.prescriptions.findUniqueOrThrow({
        where: { id: prescription.id },
        include: prescriptionInclude,
      });

      return updated as any;
    });
  }

  async findByAppointmentId(
    appointmentId: number,
  ): Promise<PrescriptionWithItems | null> {
    const result = await this.prisma.prescriptions.findUnique({
      where: { appointmentId },
      include: prescriptionInclude,
    });
    return result as any;
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
