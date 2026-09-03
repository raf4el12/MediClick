/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { PrismaService } from '../../../../prisma/prisma.service.js';
import { AppointmentStatus } from '../../../../shared/domain/enums/appointment-status.enum.js';
import { PrismaAppointmentRepository } from './prisma-appointment.repository.js';
import { AppointmentCancellationService } from '../../application/services/appointment-cancellation.service.js';
import type { EventEmitter2 } from '@nestjs/event-emitter';

const describeDatabase =
  process.env.RUN_DB_INTEGRATION === '1' ? describe : describe.skip;

describeDatabase(
  'PrismaAppointmentRepository QR Check-in Atomicity (PostgreSQL)',
  () => {
    const prisma = new PrismaService();
    const repository = new PrismaAppointmentRepository(prisma);
    const eventEmitter = { emit: jest.fn() };
    const cancellationService = new AppointmentCancellationService(
      repository,
      eventEmitter as unknown as EventEmitter2,
    );

    const suffix = `qr-checkin-${process.pid}-${Date.now()}`;
    const appointmentIds: number[] = [];
    let clinicId: number;
    let doctorId: number;
    let patientId: number;
    let scheduleId: number;

    beforeAll(async () => {
      try {
        await prisma.$connect();
        const clinic = await prisma.clinics.create({
          data: {
            name: `QR Checkin Clinic ${suffix}`,
            timezone: 'America/Lima',
          },
        });
        clinicId = clinic.id;
      } catch (err) {
        console.error('BEFOREALL ERROR:', err);
        throw err;
      }

      const doctorUser = await prisma.users.create({
        data: {
          name: 'QR Doctor',
          email: `qr-doctor@${suffix}.test`,
          password: 'password',
          clinicId,
        },
      });
      const doctorProfile = await prisma.profiles.create({
        data: { name: 'Doctor', lastName: 'House', userId: doctorUser.id },
      });
      const doctor = await prisma.doctors.create({
        data: {
          profileId: doctorProfile.id,
          licenseNumber: `LIC-${suffix}`,
          clinicId,
        },
      });
      doctorId = doctor.id;

      const category = await prisma.categories.create({
        data: { name: `Cat ${suffix}` },
      });
      const specialty = await prisma.specialties.create({
        data: {
          name: `Spec ${suffix}`,
          categoryId: category.id,
          duration: 30,
          price: 100,
        },
      });

      const schedule = await prisma.schedules.create({
        data: {
          doctorId,
          specialtyId: specialty.id,
          clinicId,
          scheduleDate: new Date('2099-01-01T00:00:00.000Z'),
          timeFrom: new Date('1970-01-01T08:00:00.000Z'),
          timeTo: new Date('1970-01-01T17:00:00.000Z'),
        },
      });
      scheduleId = schedule.id;

      const patientUser = await prisma.users.create({
        data: {
          name: 'QR Patient',
          email: `qr-patient@${suffix}.test`,
          password: 'password',
        },
      });
      const patientProfile = await prisma.profiles.create({
        data: { name: 'Patient', lastName: 'One', userId: patientUser.id },
      });
      const patient = await prisma.patients.create({
        data: {
          profileId: patientProfile.id,
          emergencyContact: '999888777',
          bloodType: 'O+',
        },
      });
      patientId = patient.id;
    });

    afterAll(async () => {
      try {
        if (appointmentIds.length > 0) {
          await prisma.transactions.deleteMany({
            where: { appointmentId: { in: appointmentIds } },
          });
          await prisma.appointments.deleteMany({
            where: { id: { in: appointmentIds } },
          });
        }
        if (scheduleId) {
          await prisma.schedules.deleteMany({ where: { id: scheduleId } });
        }
        if (patientId) {
          await prisma.patients.deleteMany({ where: { id: patientId } });
        }
        if (doctorId) {
          await prisma.doctors.deleteMany({ where: { id: doctorId } });
        }
        await prisma.profiles.deleteMany({
          where: { user: { email: { contains: suffix } } },
        });
        await prisma.users.deleteMany({
          where: { email: { contains: suffix } },
        });
        await prisma.specialties.deleteMany({
          where: { name: { contains: suffix } },
        });
        await prisma.categories.deleteMany({
          where: { name: { contains: suffix } },
        });
        if (clinicId) {
          await prisma.clinics.deleteMany({ where: { id: clinicId } });
        }
      } finally {
        await prisma.$disconnect();
      }
    });

    const createAppointment = async (
      status: AppointmentStatus = AppointmentStatus.CONFIRMED,
    ) => {
      const appt = await prisma.appointments.create({
        data: {
          patientId,
          scheduleId,
          clinicId,
          status,
          startTime: new Date('1970-01-01T09:00:00.000Z'),
          endTime: new Date('1970-01-01T09:30:00.000Z'),
        },
      });
      appointmentIds.push(appt.id);
      return appt;
    };

    it('Step 1: carrera real entre cancelación y checkInAtomically termina exclusivamente en CANCELLED o IN_PROGRESS sin revivir', async () => {
      const iterations = 5;

      for (let i = 0; i < iterations; i++) {
        const appt = await createAppointment(AppointmentStatus.CONFIRMED);

        const cancelPromise = cancellationService
          .cancel({
            appointmentId: appt.id,
            reason: 'Cancelación concurrente',
            cancelledBy: 'patient',
          })
          .then((res) => ({ winner: 'cancel' as const, res }))
          .catch((err) => ({ winner: 'cancel_failed' as const, err }));

        const checkInPromise = repository
          .checkInAtomically({
            appointmentId: appt.id,
            clinicId,
            checkedInAt: new Date(),
          })
          .then((res) => ({ winner: 'checkin' as const, res }))
          .catch((err) => ({ winner: 'checkin_failed' as const, err }));

        const [, checkInResult] = await Promise.all([
          cancelPromise,
          checkInPromise,
        ]);

        const finalRow = await prisma.appointments.findUniqueOrThrow({
          where: { id: appt.id },
        });

        expect(['CANCELLED', 'IN_PROGRESS']).toContain(finalRow.status);

        if (finalRow.status === 'CANCELLED') {
          // Cancelación ganó: check-in retornó null
          if (checkInResult.winner === 'checkin') {
            expect(checkInResult.res).toBeNull();
          }
        } else if (finalRow.status === 'IN_PROGRESS') {
          // Check-in ganó: check-in retornó la fila actualizada
          if (checkInResult.winner === 'checkin') {
            expect(checkInResult.res).not.toBeNull();
            expect(checkInResult.res?.status).toBe(
              AppointmentStatus.IN_PROGRESS,
            );
          }
        }
      }
    });

    it('Step 2: dos check-ins atómicos concurrentes para la misma cita producen exactamente un ganador y un null', async () => {
      const appt = await createAppointment(AppointmentStatus.CONFIRMED);
      const arrivalTime = new Date();

      const [res1, res2] = await Promise.all([
        repository.checkInAtomically({
          appointmentId: appt.id,
          clinicId,
          checkedInAt: arrivalTime,
        }),
        repository.checkInAtomically({
          appointmentId: appt.id,
          clinicId,
          checkedInAt: arrivalTime,
        }),
      ]);

      const nonNullCount = [res1, res2].filter((r) => r !== null).length;
      const nullCount = [res1, res2].filter((r) => r === null).length;

      expect(nonNullCount).toBe(1);
      expect(nullCount).toBe(1);

      const finalRow = await prisma.appointments.findUniqueOrThrow({
        where: { id: appt.id },
      });
      expect(finalRow.status).toBe('IN_PROGRESS');
      expect(finalRow.checkedInAt).not.toBeNull();
    });
  },
);
