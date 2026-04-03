import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service.js';
import type { IPatientRecordQueryPort } from '../../domain/interfaces/patient-record-query.port.js';
import type { PatientRecord } from '../../domain/types/patient-record.types.js';

@Injectable()
export class PrismaPatientRecordQuery implements IPatientRecordQueryPort {
  constructor(private readonly prisma: PrismaService) {}

  async getPatientRecord(patientId: number): Promise<PatientRecord | null> {
    const patient = await this.prisma.patients.findUnique({
      where: { id: patientId, deleted: false },
      include: {
        profile: true,
        medicalHistory: {
          where: { deleted: false },
        },
        appointments: {
          where: { deleted: false },
          orderBy: { startTime: 'desc' },
          include: {
            clinicalNotes: { where: { deleted: false } },
            schedule: {
              include: {
                doctor: {
                  include: { profile: true },
                },
              },
            },
          },
        },
      },
    });

    if (!patient) return null;

    return {
      id: patient.id,
      bloodType: patient.bloodType,
      allergies: patient.allergies ?? undefined,
      chronicConditions: patient.chronicConditions ?? undefined,
      profile: patient.profile
        ? {
            name: patient.profile.name,
            lastName: patient.profile.lastName,
            email: patient.profile.email,
            phone: patient.profile.phone ?? undefined,
            typeDocument: patient.profile.typeDocument ?? undefined,
            numberDocument: patient.profile.numberDocument ?? undefined,
          }
        : undefined,
      medicalHistory: patient.medicalHistory.map((mh) => ({
        condition: mh.condition,
        status: mh.status,
        notes: mh.notes ?? undefined,
      })),
      appointments: patient.appointments.map((app) => ({
        id: app.id,
        startTime: app.startTime,
        status: app.status,
        reason: app.reason ?? undefined,
        schedule: app.schedule
          ? {
              doctor: app.schedule.doctor?.profile
                ? {
                    name: app.schedule.doctor.profile.name,
                    lastName: app.schedule.doctor.profile.lastName,
                  }
                : undefined,
            }
          : undefined,
        clinicalNotes: app.clinicalNotes.map((cn) => ({
          diagnosis: cn.diagnosis ?? undefined,
          plan: cn.plan ?? undefined,
        })),
      })),
    };
  }

  async getPatientIdByUserId(userId: number): Promise<number | null> {
    const profile = await this.prisma.profiles.findFirst({
      where: { userId, deleted: false },
      include: { patient: { select: { id: true } } },
    });

    return profile?.patient?.id ?? null;
  }
}
