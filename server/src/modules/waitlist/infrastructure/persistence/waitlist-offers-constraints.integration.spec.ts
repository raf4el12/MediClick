import { PrismaService } from '../../../../prisma/prisma.service.js';
import { WaitlistTimePreference } from '../../domain/enums/waitlist-time-preference.enum.js';
import { WaitlistEntryStatus } from '../../domain/enums/waitlist-entry-status.enum.js';

/**
 * SDD-015 — G-06: `WaitlistOffers.createdAppointmentId` no tiene unicidad y
 * no existe un índice parcial que garantice como máximo una oferta PENDING
 * por `scheduleId`. `acceptOfferAtomically` (SDD-013) ya vincula
 * `createdAppointmentId` dentro de una transacción serializable, pero eso
 * es una barrera de aplicación, no la última barrera de base de datos que
 * pide el SDD para "una cita no puede completar varias ofertas" y "una
 * oferta exclusiva activa por cupo".
 *
 * Requiere Postgres real: `RUN_DB_INTEGRATION=1 DATABASE_URL=... pnpm test -- waitlist-offers-constraints.integration`
 */
const describeDatabase =
  process.env.RUN_DB_INTEGRATION === '1' ? describe : describe.skip;

describeDatabase('WaitlistOffers constraints (PostgreSQL)', () => {
  const prisma = new PrismaService();
  const suffix = `${process.pid}-${Date.now()}`;
  const appointmentIds: number[] = [];
  const offerIds: number[] = [];
  const entryIds: number[] = [];
  let clinicId: number;
  let doctorId: number;
  let specialtyId: number;
  let scheduleAId: number;
  let scheduleBId: number;
  let patientId: number;
  const slotStart = new Date('1970-01-01T09:00:00Z');
  const slotEnd = new Date('1970-01-01T09:30:00Z');

  beforeAll(async () => {
    await prisma.$connect();
    const clinic = await prisma.clinics.create({
      data: { name: `Offer-constraints clinic ${suffix}` },
    });
    clinicId = clinic.id;

    const doctorUser = await prisma.users.create({
      data: {
        name: 'Offer-constraints doctor',
        email: `offer-constraints-doctor@${suffix}.test`,
        password: 'integration-test-only',
        clinicId,
      },
    });
    const doctorProfile = await prisma.profiles.create({
      data: { name: 'Offer', lastName: 'Doctor', userId: doctorUser.id },
    });
    const doctor = await prisma.doctors.create({
      data: {
        profileId: doctorProfile.id,
        licenseNumber: `OFC-${suffix}`,
        clinicId,
      },
    });
    doctorId = doctor.id;

    const category = await prisma.categories.create({
      data: { name: `Offer-constraints category ${suffix}` },
    });
    const specialty = await prisma.specialties.create({
      data: {
        name: `Offer-constraints specialty ${suffix}`,
        categoryId: category.id,
        duration: 30,
        price: 100,
      },
    });
    specialtyId = specialty.id;

    const scheduleA = await prisma.schedules.create({
      data: {
        doctorId,
        specialtyId,
        clinicId,
        scheduleDate: new Date('2099-07-05T00:00:00Z'),
        timeFrom: slotStart,
        timeTo: slotEnd,
      },
    });
    scheduleAId = scheduleA.id;
    const scheduleB = await prisma.schedules.create({
      data: {
        doctorId,
        specialtyId,
        clinicId,
        scheduleDate: new Date('2099-07-06T00:00:00Z'),
        timeFrom: slotStart,
        timeTo: slotEnd,
      },
    });
    scheduleBId = scheduleB.id;

    const patientUser = await prisma.users.create({
      data: {
        name: 'Offer-constraints patient',
        email: `offer-constraints-patient@${suffix}.test`,
        password: 'integration-test-only',
      },
    });
    const patientProfile = await prisma.profiles.create({
      data: { name: 'Offer', lastName: 'Patient', userId: patientUser.id },
    });
    const patient = await prisma.patients.create({
      data: {
        profileId: patientProfile.id,
        emergencyContact: '999999999',
        bloodType: 'B+',
      },
    });
    patientId = patient.id;
  });

  afterAll(async () => {
    await prisma.waitlistOffers.deleteMany({
      where: { id: { in: offerIds } },
    });
    await prisma.appointments.deleteMany({
      where: { id: { in: appointmentIds } },
    });
    await prisma.waitlistEntries.deleteMany({
      where: { id: { in: entryIds } },
    });
    await prisma.schedules.deleteMany({
      where: { id: { in: [scheduleAId, scheduleBId] } },
    });
    await prisma.doctors.deleteMany({ where: { id: doctorId } });
    await prisma.specialties.deleteMany({ where: { id: specialtyId } });
    await prisma.categories.deleteMany({
      where: { name: `Offer-constraints category ${suffix}` },
    });
    await prisma.patients.deleteMany({ where: { id: patientId } });
    await prisma.profiles.deleteMany({
      where: { user: { email: { endsWith: `@${suffix}.test` } } },
    });
    await prisma.users.deleteMany({
      where: { email: { endsWith: `@${suffix}.test` } },
    });
    await prisma.clinics.deleteMany({ where: { id: clinicId } });
    await prisma.onModuleDestroy();
  });

  const createEntry = async (scheduleDate: Date) => {
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

  const createAppointment = async (scheduleId: number) => {
    const appointment = await prisma.appointments.create({
      data: {
        patientId,
        scheduleId,
        clinicId,
        startTime: slotStart,
        endTime: slotEnd,
        status: 'PENDING',
        amount: 100,
      },
    });
    appointmentIds.push(appointment.id);
    return appointment;
  };

  it('rejects a second offer linked to an appointment that is already the target of another offer', async () => {
    const appointment = await createAppointment(scheduleAId);
    const entryA = await createEntry(new Date('2099-07-05T00:00:00Z'));
    const entryB = await createEntry(new Date('2099-07-05T00:00:00Z'));

    const firstOffer = await prisma.waitlistOffers.create({
      data: {
        waitlistEntryId: entryA.id,
        scheduleId: scheduleAId,
        startTime: slotStart,
        endTime: slotEnd,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        clinicId,
        status: 'ACCEPTED',
        createdAppointmentId: appointment.id,
      },
    });
    offerIds.push(firstOffer.id);

    // Sin constraint única sobre createdAppointmentId, hoy una SEGUNDA
    // oferta puede vincularse a la MISMA cita — violando "una cita no puede
    // completar varias ofertas". Después de la migración debe fallar P2002.
    await expect(
      prisma.waitlistOffers.create({
        data: {
          waitlistEntryId: entryB.id,
          scheduleId: scheduleAId,
          startTime: slotStart,
          endTime: slotEnd,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000),
          clinicId,
          status: 'ACCEPTED',
          createdAppointmentId: appointment.id,
        },
      }),
    ).rejects.toMatchObject({ code: 'P2002' });

    await expect(
      prisma.waitlistOffers.count({
        where: { createdAppointmentId: appointment.id },
      }),
    ).resolves.toBe(1);
  });

  it('allows multiple offers with a null createdAppointmentId (still pending, not yet accepted)', async () => {
    const entryA = await createEntry(new Date('2099-07-06T00:00:00Z'));
    const entryB = await createEntry(new Date('2099-07-06T00:00:00Z'));

    const offerA = await prisma.waitlistOffers.create({
      data: {
        waitlistEntryId: entryA.id,
        scheduleId: scheduleBId,
        startTime: slotStart,
        endTime: slotEnd,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        clinicId,
        status: 'EXPIRED',
      },
    });
    offerIds.push(offerA.id);

    await expect(
      prisma.waitlistOffers.create({
        data: {
          waitlistEntryId: entryB.id,
          scheduleId: scheduleBId,
          startTime: slotStart,
          endTime: slotEnd,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000),
          clinicId,
          status: 'EXPIRED',
        },
      }),
    ).resolves.toMatchObject({ createdAppointmentId: null });
  });

  it('rejects a second PENDING offer for a scheduleId that already has one PENDING offer', async () => {
    const scheduleDate = new Date('2099-07-07T00:00:00Z');
    const schedule = await prisma.schedules.create({
      data: {
        doctorId,
        specialtyId,
        clinicId,
        scheduleDate,
        timeFrom: slotStart,
        timeTo: slotEnd,
      },
    });

    const entryA = await createEntry(scheduleDate);
    const entryB = await createEntry(scheduleDate);

    const firstOffer = await prisma.waitlistOffers.create({
      data: {
        waitlistEntryId: entryA.id,
        scheduleId: schedule.id,
        startTime: slotStart,
        endTime: slotEnd,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        clinicId,
        status: 'PENDING',
      },
    });
    offerIds.push(firstOffer.id);

    // Sin índice parcial, hoy una SEGUNDA oferta PENDING para el mismo
    // scheduleId se crea igual — violando "una oferta exclusiva activa por
    // cupo". Después de la migración debe fallar por conflicto de unicidad.
    await expect(
      prisma.waitlistOffers.create({
        data: {
          waitlistEntryId: entryB.id,
          scheduleId: schedule.id,
          startTime: slotStart,
          endTime: slotEnd,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000),
          clinicId,
          status: 'PENDING',
        },
      }),
    ).rejects.toMatchObject({ code: 'P2002' });

    await expect(
      prisma.waitlistOffers.count({
        where: { scheduleId: schedule.id, status: 'PENDING' },
      }),
    ).resolves.toBe(1);

    await prisma.waitlistOffers.deleteMany({
      where: { scheduleId: schedule.id },
    });
    await prisma.schedules.delete({ where: { id: schedule.id } });
  });

  it('allows a new PENDING offer for a scheduleId whose previous offer already moved to a terminal status', async () => {
    const scheduleDate = new Date('2099-07-08T00:00:00Z');
    const schedule = await prisma.schedules.create({
      data: {
        doctorId,
        specialtyId,
        clinicId,
        scheduleDate,
        timeFrom: slotStart,
        timeTo: slotEnd,
      },
    });

    const entryA = await createEntry(scheduleDate);
    const entryB = await createEntry(scheduleDate);

    const firstOffer = await prisma.waitlistOffers.create({
      data: {
        waitlistEntryId: entryA.id,
        scheduleId: schedule.id,
        startTime: slotStart,
        endTime: slotEnd,
        expiresAt: new Date(Date.now() - 1000),
        clinicId,
        status: 'EXPIRED',
      },
    });
    offerIds.push(firstOffer.id);

    const secondOffer = await prisma.waitlistOffers.create({
      data: {
        waitlistEntryId: entryB.id,
        scheduleId: schedule.id,
        startTime: slotStart,
        endTime: slotEnd,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        clinicId,
        status: 'PENDING',
      },
    });
    offerIds.push(secondOffer.id);

    expect(secondOffer.id).not.toBe(firstOffer.id);

    await prisma.waitlistOffers.deleteMany({
      where: { scheduleId: schedule.id },
    });
    await prisma.schedules.delete({ where: { id: schedule.id } });
  });
});
