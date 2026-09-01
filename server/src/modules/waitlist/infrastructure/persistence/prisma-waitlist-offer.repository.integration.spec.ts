import { PrismaService } from '../../../../prisma/prisma.service.js';
import { PrismaAppointmentRepository } from '../../../appointments/infrastructure/persistence/prisma-appointment.repository.js';
import { PrismaWaitlistOfferRepository } from './prisma-waitlist-offer.repository.js';
import { AcceptOfferAtomicallyError } from '../../domain/repositories/waitlist-offer.repository.js';
import { WaitlistOfferStatus } from '../../domain/enums/waitlist-offer-status.enum.js';
import { WaitlistEntryStatus } from '../../domain/enums/waitlist-entry-status.enum.js';
import { WaitlistTimePreference } from '../../domain/enums/waitlist-time-preference.enum.js';

/**
 * SDD-013 — G-03: los mocks certifican la forma de la API, pero solo
 * PostgreSQL real certifica que `Serializable` + el claim condicional
 * impiden que dos transacciones concurrentes completen la misma oferta, y
 * que una reserva directa concurrente y la aceptación de una oferta no
 * puedan coexistir en el mismo slot.
 *
 * Requiere Postgres real: `RUN_DB_INTEGRATION=1 pnpm test -- prisma-waitlist-offer.repository.integration`
 * (con `docker compose up -d` corrido en `server/` y migraciones aplicadas).
 */
const describeDatabase =
  process.env.RUN_DB_INTEGRATION === '1' ? describe : describe.skip;

describeDatabase(
  'PrismaWaitlistOfferRepository.acceptOfferAtomically (PostgreSQL)',
  () => {
    const prisma = new PrismaService();
    const offerRepository = new PrismaWaitlistOfferRepository(prisma);
    const appointmentRepository = new PrismaAppointmentRepository(prisma);
    const suffix = `${process.pid}-${Date.now()}`;

    let clinicId: number;
    let doctorId: number;
    let specialtyId: number;
    let scheduleId: number;
    let patientAId: number;
    let patientBId: number;
    const slotStart = new Date('1970-01-01T09:00:00Z');
    const slotEnd = new Date('1970-01-01T09:30:00Z');
    const scheduleDate = new Date('2099-06-01T00:00:00Z');

    const appointmentIds: number[] = [];
    const entryIds: number[] = [];
    const offerIds: number[] = [];

    const createEntry = async (patientId: number) => {
      const entry = await prisma.waitlistEntries.create({
        data: {
          patientId,
          specialtyId,
          clinicId,
          dateFrom: scheduleDate,
          dateTo: scheduleDate,
          timePreference: WaitlistTimePreference.ANY,
          status: WaitlistEntryStatus.ACTIVE,
        },
      });
      entryIds.push(entry.id);
      return entry;
    };

    const createOffer = async (
      waitlistEntryId: number,
      expiresInMs = 15 * 60 * 1000,
    ) => {
      const offer = await prisma.waitlistOffers.create({
        data: {
          waitlistEntryId,
          scheduleId,
          startTime: slotStart,
          endTime: slotEnd,
          expiresAt: new Date(Date.now() + expiresInMs),
          clinicId,
        },
      });
      offerIds.push(offer.id);
      return offer;
    };

    beforeAll(async () => {
      await prisma.$connect();
      const clinic = await prisma.clinics.create({
        data: { name: `Waitlist-accept clinic ${suffix}` },
      });
      clinicId = clinic.id;

      const doctorUser = await prisma.users.create({
        data: {
          name: 'Waitlist doctor',
          email: `waitlist-doctor@${suffix}.test`,
          password: 'integration-test-only',
          clinicId,
        },
      });
      const doctorProfile = await prisma.profiles.create({
        data: { name: 'Waitlist', lastName: 'Doctor', userId: doctorUser.id },
      });
      const doctor = await prisma.doctors.create({
        data: {
          profileId: doctorProfile.id,
          licenseNumber: `WLA-${suffix}`,
          clinicId,
        },
      });
      doctorId = doctor.id;

      const category = await prisma.categories.create({
        data: { name: `Waitlist-accept category ${suffix}` },
      });
      const specialty = await prisma.specialties.create({
        data: {
          name: `Waitlist-accept specialty ${suffix}`,
          categoryId: category.id,
          duration: 30,
          price: 100,
        },
      });
      specialtyId = specialty.id;

      const schedule = await prisma.schedules.create({
        data: {
          doctorId,
          specialtyId,
          clinicId,
          scheduleDate,
          timeFrom: slotStart,
          timeTo: new Date('1970-01-01T13:00:00Z'),
        },
      });
      scheduleId = schedule.id;

      const makePatient = async (tag: string) => {
        const user = await prisma.users.create({
          data: {
            name: `Waitlist patient ${tag}`,
            email: `waitlist-patient-${tag}@${suffix}.test`,
            password: 'integration-test-only',
          },
        });
        const profile = await prisma.profiles.create({
          data: { name: 'Patient', lastName: tag, userId: user.id },
        });
        const patient = await prisma.patients.create({
          data: {
            profileId: profile.id,
            emergencyContact: '999999999',
            bloodType: 'O+',
          },
        });
        return patient.id;
      };
      patientAId = await makePatient('a');
      patientBId = await makePatient('b');
    });

    afterAll(async () => {
      await prisma.appointments.deleteMany({
        where: { id: { in: appointmentIds } },
      });
      await prisma.waitlistOffers.deleteMany({
        where: { id: { in: offerIds } },
      });
      await prisma.waitlistEntries.deleteMany({
        where: { id: { in: entryIds } },
      });
      await prisma.schedules.deleteMany({ where: { id: scheduleId } });
      await prisma.doctors.deleteMany({ where: { id: doctorId } });
      await prisma.specialties.deleteMany({ where: { id: specialtyId } });
      await prisma.categories.deleteMany({
        where: { name: `Waitlist-accept category ${suffix}` },
      });
      await prisma.patients.deleteMany({
        where: { id: { in: [patientAId, patientBId] } },
      });
      await prisma.profiles.deleteMany({
        where: { user: { email: { endsWith: `@${suffix}.test` } } },
      });
      await prisma.users.deleteMany({
        where: { email: { endsWith: `@${suffix}.test` } },
      });
      await prisma.clinics.deleteMany({ where: { id: clinicId } });
      await prisma.onModuleDestroy();
    });

    afterEach(async () => {
      // Libera el slot fijo entre tests: cancela cualquier cita creada sobre él.
      await prisma.appointments.updateMany({
        where: { id: { in: appointmentIds }, scheduleId },
        data: { status: 'CANCELLED' },
      });
      // Y cierra cualquier oferta PENDING que haya quedado colgando (p.ej.
      // porque la transacción de `acceptOfferAtomically` hizo rollback tras
      // perder la carrera contra una reserva directa). Sin esto, el índice
      // único parcial de SDD-015 ("una oferta PENDING exclusiva por cupo")
      // rechaza la oferta del siguiente test sobre el mismo scheduleId.
      await prisma.waitlistOffers.updateMany({
        where: { id: { in: offerIds }, scheduleId, status: 'PENDING' },
        data: { status: 'EXPIRED' },
      });
    });

    it('crea la cita con amount y pendingUntil, cierra la entrada y vincula la oferta — todo en una transacción', async () => {
      const entry = await createEntry(patientAId);
      const offer = await createOffer(entry.id);
      const pendingUntil = new Date(Date.now() + 15 * 60 * 1000);

      const result = await offerRepository.acceptOfferAtomically({
        offerId: offer.id,
        patientId: patientAId,
        now: new Date(),
        pendingUntil,
        amount: 100,
      });
      appointmentIds.push(result.appointment.id);

      expect(result.appointment.amount).toBe(100);
      expect(result.appointment.pendingUntil).toBeInstanceOf(Date);
      expect(result.offer.status).toBe(WaitlistOfferStatus.ACCEPTED);
      expect(result.offer.createdAppointmentId).toBe(result.appointment.id);

      const persistedEntry = await prisma.waitlistEntries.findUniqueOrThrow({
        where: { id: entry.id },
      });
      expect(persistedEntry.status).toBe(WaitlistEntryStatus.FULFILLED);

      const persistedAppointment = await prisma.appointments.findUniqueOrThrow({
        where: { id: result.appointment.id },
      });
      expect(Number(persistedAppointment.amount)).toBe(100);
      expect(persistedAppointment.pendingUntil).not.toBeNull();
    });

    it('rechaza doble aceptación concurrente de la misma oferta: solo una transacción gana', async () => {
      const entry = await createEntry(patientAId);
      const offer = await createOffer(entry.id);
      const pendingUntil = new Date(Date.now() + 15 * 60 * 1000);

      const attempt = () =>
        offerRepository.acceptOfferAtomically({
          offerId: offer.id,
          patientId: patientAId,
          now: new Date(),
          pendingUntil,
          amount: 100,
        });

      const results = await Promise.allSettled([attempt(), attempt()]);

      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      const rejected = results.filter((r) => r.status === 'rejected');
      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);

      const rejection = rejected[0];
      expect(rejection.reason).toBeInstanceOf(AcceptOfferAtomicallyError);
      expect((rejection.reason as AcceptOfferAtomicallyError).reason).toBe(
        'OFFER_NOT_CLAIMABLE',
      );

      const won = fulfilled[0];
      appointmentIds.push(won.value.appointment.id);

      await expect(
        prisma.appointments.count({
          where: {
            scheduleId,
            startTime: slotStart,
            status: { not: 'CANCELLED' },
          },
        }),
      ).resolves.toBe(1);
    });

    it('rechaza la aceptación cuando una reserva directa concurrente ya ocupó el slot', async () => {
      const entry = await createEntry(patientBId);
      const offer = await createOffer(entry.id);
      const pendingUntil = new Date(Date.now() + 15 * 60 * 1000);

      const directBooking = () =>
        appointmentRepository.createWithOverlapCheck(
          {
            patientId: patientAId,
            scheduleId,
            startTime: slotStart,
            endTime: slotEnd,
            reason: 'Reserva directa concurrente',
            clinicId,
          },
          slotStart,
          slotEnd,
        );

      const acceptOffer = () =>
        offerRepository.acceptOfferAtomically({
          offerId: offer.id,
          patientId: patientBId,
          now: new Date(),
          pendingUntil,
          amount: 100,
        });

      const results = await Promise.allSettled([
        directBooking(),
        acceptOffer(),
      ]);

      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      expect(fulfilled).toHaveLength(1); // exactamente uno de los dos ganó el slot

      for (const r of results) {
        if (r.status === 'fulfilled') {
          const value = r.value as any;
          appointmentIds.push(value.id ?? value.appointment.id);
        }
      }

      if (results[1].status === 'rejected') {
        expect(results[1].reason).toBeInstanceOf(AcceptOfferAtomicallyError);
        // Bajo Serializable, PostgreSQL puede abortar la transacción de la
        // oferta por conflicto de escritura (detectado como OFFER_NOT_CLAIMABLE
        // al reintentar el claim) antes de llegar a la revalidación explícita
        // de overlap (SLOT_OVERLAP) — ambos representan "el slot ya no estaba
        // disponible para esta oferta", con distinto punto de detección.
        expect(['OFFER_NOT_CLAIMABLE', 'SLOT_OVERLAP']).toContain(
          (results[1].reason as AcceptOfferAtomicallyError).reason,
        );
        // La entrada de lista de espera NO se cerró: la transacción completa
        // hizo rollback, el paciente sigue activo para el próximo cupo.
        const persistedEntry = await prisma.waitlistEntries.findUniqueOrThrow({
          where: { id: entry.id },
        });
        expect(persistedEntry.status).toBe(WaitlistEntryStatus.ACTIVE);
      }

      await expect(
        prisma.appointments.count({
          where: {
            scheduleId,
            startTime: slotStart,
            status: { not: 'CANCELLED' },
          },
        }),
      ).resolves.toBe(1);
    });
  },
);
