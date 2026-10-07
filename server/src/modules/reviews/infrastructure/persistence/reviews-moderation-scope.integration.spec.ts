import { PrismaService } from '../../../../prisma/prisma.service.js';
import { AppointmentStatus } from '../../../../shared/domain/enums/appointment-status.enum.js';
import { PrismaReviewRepository } from './prisma-review.repository.js';

const describeDatabase =
  process.env.RUN_DB_INTEGRATION === '1' ? describe : describe.skip;

describeDatabase('Moderación de reseñas acotada por sede (PostgreSQL)', () => {
  const prisma = new PrismaService();
  const repository = new PrismaReviewRepository(prisma);

  const suffix = `reviews-scope-${process.pid}-${Date.now()}`;
  const clinicIds: number[] = [];
  const doctorIds: number[] = [];
  const scheduleIds: number[] = [];
  const appointmentIds: number[] = [];
  const reviewIds: number[] = [];
  let patientId: number;
  let clinicA: number;
  let clinicB: number;
  let doctorA: number;
  let doctorB: number;
  let reviewA: number;
  let reviewB: number;

  const createDoctorWithReview = async (
    label: string,
    clinicId: number,
    rating: number,
  ) => {
    const user = await prisma.users.create({
      data: {
        name: `Doctor ${label}`,
        email: `doctor-${label}@${suffix}.test`,
        password: 'password',
        clinicId,
      },
    });
    const profile = await prisma.profiles.create({
      data: { name: 'Doctor', lastName: label, userId: user.id },
    });
    const doctor = await prisma.doctors.create({
      data: {
        profileId: profile.id,
        licenseNumber: `LIC-${label}-${suffix}`,
        clinicId,
        ratingAvg: 4.2,
        ratingCount: 9,
      },
    });
    doctorIds.push(doctor.id);
    const category = await prisma.categories.create({
      data: { name: `Cat ${label} ${suffix}` },
    });
    const specialty = await prisma.specialties.create({
      data: {
        name: `Spec ${label} ${suffix}`,
        categoryId: category.id,
        duration: 30,
        price: 100,
      },
    });
    const schedule = await prisma.schedules.create({
      data: {
        doctorId: doctor.id,
        specialtyId: specialty.id,
        clinicId,
        scheduleDate: new Date('2026-01-10T00:00:00.000Z'),
        timeFrom: new Date('1970-01-01T08:00:00.000Z'),
        timeTo: new Date('1970-01-01T12:00:00.000Z'),
      },
    });
    scheduleIds.push(schedule.id);
    const appointment = await prisma.appointments.create({
      data: {
        patientId,
        scheduleId: schedule.id,
        clinicId,
        status: AppointmentStatus.COMPLETED,
        startTime: new Date('1970-01-01T08:00:00.000Z'),
        endTime: new Date('1970-01-01T08:30:00.000Z'),
      },
    });
    appointmentIds.push(appointment.id);
    const review = await prisma.reviews.create({
      data: {
        appointmentId: appointment.id,
        doctorId: doctor.id,
        patientId,
        rating,
        clinicId,
      },
    });
    reviewIds.push(review.id);
    return { doctorId: doctor.id, reviewId: review.id };
  };

  beforeAll(async () => {
    await prisma.$connect();
    for (const label of ['a', 'b']) {
      const clinic = await prisma.clinics.create({
        data: { name: `Clinic ${label} ${suffix}`, timezone: 'America/Lima' },
      });
      clinicIds.push(clinic.id);
    }
    [clinicA, clinicB] = clinicIds;

    const patientUser = await prisma.users.create({
      data: {
        name: 'Paciente',
        email: `patient@${suffix}.test`,
        password: 'password',
      },
    });
    const patientProfile = await prisma.profiles.create({
      data: { name: 'Paciente', lastName: 'Reseñas', userId: patientUser.id },
    });
    const patient = await prisma.patients.create({
      data: {
        profileId: patientProfile.id,
        emergencyContact: '999888777',
        bloodType: 'O+',
      },
    });
    patientId = patient.id;

    ({ doctorId: doctorA, reviewId: reviewA } = await createDoctorWithReview(
      'a',
      clinicA,
      5,
    ));
    ({ doctorId: doctorB, reviewId: reviewB } = await createDoctorWithReview(
      'b',
      clinicB,
      1,
    ));
  });

  afterAll(async () => {
    try {
      await prisma.reviews.deleteMany({ where: { id: { in: reviewIds } } });
      await prisma.appointments.deleteMany({
        where: { id: { in: appointmentIds } },
      });
      await prisma.schedules.deleteMany({ where: { id: { in: scheduleIds } } });
      await prisma.patients.deleteMany({ where: { id: patientId } });
      await prisma.doctors.deleteMany({ where: { id: { in: doctorIds } } });
      await prisma.profiles.deleteMany({
        where: { user: { email: { contains: suffix } } },
      });
      await prisma.users.deleteMany({ where: { email: { contains: suffix } } });
      await prisma.specialties.deleteMany({
        where: { name: { contains: suffix } },
      });
      await prisma.categories.deleteMany({
        where: { name: { contains: suffix } },
      });
      await prisma.clinics.deleteMany({ where: { id: { in: clinicIds } } });
    } finally {
      await prisma.$disconnect();
    }
  });

  it('un actor de la sede A no puede ocultar una reseña de la sede B ni recalcular su rating', async () => {
    const result = await repository.setVisibility(reviewB, false, clinicA);

    expect(result).toBeNull();
    const review = await prisma.reviews.findUnique({ where: { id: reviewB } });
    const doctor = await prisma.doctors.findUnique({ where: { id: doctorB } });
    expect(review?.isVisible).toBe(true);
    expect([Number(doctor?.ratingAvg), doctor?.ratingCount]).toEqual([4.2, 9]);
  });

  it('un actor de la sede B oculta la reseña y el rating pasa a contar solo las visibles', async () => {
    const result = await repository.setVisibility(reviewB, false, clinicB);

    expect(result?.isVisible).toBe(false);
    const doctor = await prisma.doctors.findUnique({ where: { id: doctorB } });
    expect(doctor?.ratingAvg).toBeNull();
    expect(doctor?.ratingCount).toBe(0);
  });

  it('el listado y la vista por médico de la sede A no muestran reseñas de la sede B', async () => {
    const listing = await repository.findForModeration(
      { clinicId: clinicA },
      { offset: 0, limit: 50 },
    );
    const otherDoctor = await repository.findByDoctorId(
      doctorB,
      false,
      clinicA,
    );
    const ownDoctor = await repository.findByDoctorId(doctorA, false, clinicA);

    expect(listing.rows.map((row) => row.id)).toEqual([reviewA]);
    expect(otherDoctor).toEqual([]);
    expect(ownDoctor.map((row) => row.id)).toEqual([reviewA]);
  });
});
