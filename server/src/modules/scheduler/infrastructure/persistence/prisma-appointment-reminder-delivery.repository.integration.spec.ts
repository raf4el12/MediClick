import { PrismaService } from '../../../../prisma/prisma.service.js';
import { ReminderKind } from '@prisma/client';
import { PrismaAppointmentReminderDeliveryRepository } from './prisma-appointment-reminder-delivery.repository.js';
import { AppointmentStatus } from '../../../../shared/domain/enums/appointment-status.enum.js';

const describeDatabase =
  process.env.RUN_DB_INTEGRATION === '1' ? describe : describe.skip;

describeDatabase(
  'PrismaAppointmentReminderDeliveryRepository (PostgreSQL real)',
  () => {
    const prisma = new PrismaService();
    const repository = new PrismaAppointmentReminderDeliveryRepository(prisma);
    const suffix = `reminder-claim-${process.pid}-${Date.now()}`;
    let clinicId: number;
    let doctorId: number;
    let patientId: number;
    let scheduleId: number;
    let appointmentId: number;

    let categoryId: number;
    let specialtyId: number;
    let doctorUserId: number;
    let patientUserId: number;

    beforeAll(async () => {
      await prisma.$connect();
      const clinic = await prisma.clinics.create({
        data: {
          name: `Clinic ${suffix}`,
          email: `clinic-${suffix}@test.com`,
        },
      });
      clinicId = clinic.id;

      const userDoc = await prisma.users.create({
        data: {
          name: 'Doctor Test',
          email: `doc-${suffix}@test.com`,
          password: 'hash',
          clinicId,
        },
      });
      doctorUserId = userDoc.id;

      const profileDoc = await prisma.profiles.create({
        data: {
          name: 'Dr',
          lastName: 'Claim',
          userId: userDoc.id,
        },
      });

      const doctor = await prisma.doctors.create({
        data: {
          profileId: profileDoc.id,
          licenseNumber: `LIC-${suffix}`,
          clinicId,
        },
      });
      doctorId = doctor.id;

      const userPat = await prisma.users.create({
        data: {
          name: 'Patient Test',
          email: `pat-${suffix}@test.com`,
          password: 'hash',
        },
      });
      patientUserId = userPat.id;

      const profilePat = await prisma.profiles.create({
        data: {
          name: 'Patient',
          lastName: 'Claim',
          userId: userPat.id,
        },
      });

      const patient = await prisma.patients.create({
        data: {
          profileId: profilePat.id,
          emergencyContact: '123456789',
          bloodType: 'O+',
        },
      });
      patientId = patient.id;

      const category = await prisma.categories.create({
        data: {
          name: `Cat ${suffix}`,
        },
      });
      categoryId = category.id;

      const specialty = await prisma.specialties.create({
        data: {
          name: `Spec ${suffix}`,
          categoryId: category.id,
          duration: 30,
          price: 100,
        },
      });
      specialtyId = specialty.id;

      const schedule = await prisma.schedules.create({
        data: {
          doctorId,
          specialtyId: specialty.id,
          clinicId,
          scheduleDate: new Date('2026-10-10T00:00:00Z'),
          timeFrom: new Date('1970-01-01T08:00:00Z'),
          timeTo: new Date('1970-01-01T14:00:00Z'),
        },
      });
      scheduleId = schedule.id;

      const appointment = await prisma.appointments.create({
        data: {
          patientId,
          scheduleId,
          startTime: new Date('1970-01-01T09:00:00Z'),
          endTime: new Date('1970-01-01T09:30:00Z'),
          status: AppointmentStatus.CONFIRMED,
          clinicId,
        },
      });
      appointmentId = appointment.id;
    });

    afterAll(async () => {
      if (appointmentId) {
        await prisma.appointmentReminders.deleteMany({
          where: { appointmentId },
        });
        await prisma.appointments.deleteMany({ where: { id: appointmentId } });
      }
      if (scheduleId) {
        await prisma.schedules.deleteMany({ where: { id: scheduleId } });
      }
      if (specialtyId) {
        await prisma.specialties.deleteMany({ where: { id: specialtyId } });
      }
      if (categoryId) {
        await prisma.categories.deleteMany({ where: { id: categoryId } });
      }
      if (doctorId) {
        await prisma.doctors.deleteMany({ where: { id: doctorId } });
      }
      if (patientId) {
        await prisma.patients.deleteMany({ where: { id: patientId } });
      }
      if (doctorUserId || patientUserId) {
        await prisma.profiles.deleteMany({
          where: {
            userId: { in: [doctorUserId, patientUserId].filter(Boolean) },
          },
        });
        await prisma.users.deleteMany({
          where: { id: { in: [doctorUserId, patientUserId].filter(Boolean) } },
        });
      }
      if (clinicId) {
        await prisma.clinics.deleteMany({ where: { id: clinicId } });
      }
      await prisma.$disconnect();
    });

    it('RED->GREEN: solo una réplica gana el claim concurrente y permite reintento tras markFailed', async () => {
      const scheduledFor = new Date('2026-10-10T14:00:00Z');
      const now = new Date();
      const later = new Date(now.getTime() + 60_000);

      const input = {
        appointmentId,
        kind: ReminderKind.T24,
        channel: 'EMAIL',
        scheduledFor,
        now,
      };

      const claims = await Promise.all([
        repository.claim(input),
        repository.claim(input),
      ]);

      const successfulClaims = claims.filter(Boolean);
      expect(successfulClaims).toHaveLength(1);

      const winner = successfulClaims[0]!;
      expect(winner.appointmentId).toBe(appointmentId);
      expect(winner.kind).toBe(ReminderKind.T24);
      expect(winner.channel).toBe('EMAIL');

      // Marcar fallido y verificar que más adelante puede ser reclamado nuevamente para reintento
      const failed = await repository.markFailed(
        winner.id,
        winner.claimToken,
        later,
        'SMTP_FALSE',
      );
      expect(failed).toBe(true);

      // Ahora a la hora `later`, el reintento debe ser exitoso
      const retryClaim = await repository.claim({
        ...input,
        now: new Date(later.getTime() + 1000),
      });
      expect(retryClaim).not.toBeNull();
      expect(retryClaim!.id).toBe(winner.id);

      // Si se marca enviado (SENT), ya no puede volver a reclamarse
      const sent = await repository.markSent(
        retryClaim!.id,
        retryClaim!.claimToken,
        new Date(),
      );
      expect(sent).toBe(true);

      const thirdClaim = await repository.claim({
        ...input,
        now: new Date(later.getTime() + 5000),
      });
      expect(thirdClaim).toBeNull();
    });

    it('RED->GREEN: tras un reagendamiento (distinto scheduledFor), permite un nuevo claim sin eliminar historial', async () => {
      const rescheduledScheduled = new Date('2026-10-12T14:00:00Z');
      const now = new Date();

      const rescheduledClaim = await repository.claim({
        appointmentId,
        kind: ReminderKind.T24,
        channel: 'EMAIL',
        scheduledFor: rescheduledScheduled,
        now,
      });

      expect(rescheduledClaim).not.toBeNull();
      expect(rescheduledClaim!.scheduledFor).toEqual(rescheduledScheduled);
    });
  },
);
