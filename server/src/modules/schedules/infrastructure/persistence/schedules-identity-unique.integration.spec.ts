import { PrismaService } from '../../../../prisma/prisma.service.js';

/**
 * SDD-015 — G-06: `Schedules` no tiene unicidad en la base de datos sobre la
 * identidad médico+especialidad+sede+fecha+intervalo. `PrismaScheduleRepository
 * .createMany` ya usa `skipDuplicates: true`, pero sin un índice único ese
 * flag es un no-op: Prisma no tiene nada contra qué deduplicar.
 *
 * `ScheduleGenerationPlanner` (dominio puro, SDD-008) ya calcula la identidad
 * correcta con `specialtyId` incluido, así que dos especialidades simultáneas
 * de un médico generan filas distintas legítimamente — el constraint no debe
 * impedir eso, solo impedir dos filas EXACTAMENTE iguales.
 *
 * Requiere Postgres real: `RUN_DB_INTEGRATION=1 DATABASE_URL=... pnpm test -- schedules-identity-unique.integration`
 */
const describeDatabase =
  process.env.RUN_DB_INTEGRATION === '1' ? describe : describe.skip;

describeDatabase('Schedules identity unique constraint (PostgreSQL)', () => {
  const prisma = new PrismaService();
  const suffix = `${process.pid}-${Date.now()}`;
  const scheduleIds: number[] = [];
  let clinicId: number;
  let doctorId: number;
  let specialtyAId: number;
  let specialtyBId: number;
  const scheduleDate = new Date('2099-07-01T00:00:00Z');
  const timeFrom = new Date('1970-01-01T09:00:00Z');
  const timeTo = new Date('1970-01-01T09:30:00Z');

  beforeAll(async () => {
    await prisma.$connect();
    const clinic = await prisma.clinics.create({
      data: { name: `Schedule-identity clinic ${suffix}` },
    });
    clinicId = clinic.id;

    const doctorUser = await prisma.users.create({
      data: {
        name: 'Schedule-identity doctor',
        email: `schedule-identity-doctor@${suffix}.test`,
        password: 'integration-test-only',
        clinicId,
      },
    });
    const doctorProfile = await prisma.profiles.create({
      data: {
        name: 'Schedule',
        lastName: 'Doctor',
        userId: doctorUser.id,
      },
    });
    const doctor = await prisma.doctors.create({
      data: {
        profileId: doctorProfile.id,
        licenseNumber: `SCI-${suffix}`,
        clinicId,
      },
    });
    doctorId = doctor.id;

    const category = await prisma.categories.create({
      data: { name: `Schedule-identity category ${suffix}` },
    });
    const specialtyA = await prisma.specialties.create({
      data: {
        name: `Schedule-identity specialty A ${suffix}`,
        categoryId: category.id,
        duration: 30,
        price: 100,
      },
    });
    specialtyAId = specialtyA.id;
    const specialtyB = await prisma.specialties.create({
      data: {
        name: `Schedule-identity specialty B ${suffix}`,
        categoryId: category.id,
        duration: 30,
        price: 100,
      },
    });
    specialtyBId = specialtyB.id;
  });

  afterAll(async () => {
    await prisma.schedules.deleteMany({ where: { id: { in: scheduleIds } } });
    await prisma.specialties.deleteMany({
      where: { id: { in: [specialtyAId, specialtyBId] } },
    });
    await prisma.categories.deleteMany({
      where: { name: `Schedule-identity category ${suffix}` },
    });
    await prisma.doctors.deleteMany({ where: { id: doctorId } });
    await prisma.profiles.deleteMany({
      where: { user: { email: { endsWith: `@${suffix}.test` } } },
    });
    await prisma.users.deleteMany({
      where: { email: { endsWith: `@${suffix}.test` } },
    });
    await prisma.clinics.deleteMany({ where: { id: clinicId } });
    await prisma.onModuleDestroy();
  });

  it('rejects a second schedule with the exact same doctor+specialty+clinic+date+interval', async () => {
    const first = await prisma.schedules.create({
      data: {
        doctorId,
        specialtyId: specialtyAId,
        clinicId,
        scheduleDate,
        timeFrom,
        timeTo,
      },
    });
    scheduleIds.push(first.id);

    // Sin constraint única, esta segunda fila con la MISMA identidad hoy se
    // crea igual — lo que demuestra la ausencia de la barrera. Después de la
    // migración debe lanzar un error de unicidad (P2002).
    await expect(
      prisma.schedules.create({
        data: {
          doctorId,
          specialtyId: specialtyAId,
          clinicId,
          scheduleDate,
          timeFrom,
          timeTo,
        },
      }),
    ).rejects.toMatchObject({ code: 'P2002' });

    await expect(
      prisma.schedules.count({
        where: {
          doctorId,
          specialtyId: specialtyAId,
          clinicId,
          scheduleDate,
          timeFrom,
          timeTo,
        },
      }),
    ).resolves.toBe(1);
  });

  it('allows two different specialties for the same doctor, date and interval (SDD-008 identity)', async () => {
    const forSpecialtyA = await prisma.schedules.create({
      data: {
        doctorId,
        specialtyId: specialtyAId,
        clinicId,
        scheduleDate,
        timeFrom: new Date('1970-01-01T10:00:00Z'),
        timeTo: new Date('1970-01-01T10:30:00Z'),
      },
    });
    scheduleIds.push(forSpecialtyA.id);

    const forSpecialtyB = await prisma.schedules.create({
      data: {
        doctorId,
        specialtyId: specialtyBId,
        clinicId,
        scheduleDate,
        timeFrom: new Date('1970-01-01T10:00:00Z'),
        timeTo: new Date('1970-01-01T10:30:00Z'),
      },
    });
    scheduleIds.push(forSpecialtyB.id);

    expect(forSpecialtyA.id).not.toBe(forSpecialtyB.id);
  });

  it('createMany with skipDuplicates silently drops rows that collide with an existing identity', async () => {
    const seed = await prisma.schedules.create({
      data: {
        doctorId,
        specialtyId: specialtyAId,
        clinicId,
        scheduleDate,
        timeFrom: new Date('1970-01-01T11:00:00Z'),
        timeTo: new Date('1970-01-01T11:30:00Z'),
      },
    });
    scheduleIds.push(seed.id);

    // Hoy, sin índice único, `skipDuplicates` no tiene nada contra qué
    // deduplicar: Prisma inserta la fila duplicada de todas formas.
    // Después de la migración, `skipDuplicates` debe omitirla realmente.
    const result = await prisma.schedules.createMany({
      data: [
        {
          doctorId,
          specialtyId: specialtyAId,
          clinicId,
          scheduleDate,
          timeFrom: new Date('1970-01-01T11:00:00Z'),
          timeTo: new Date('1970-01-01T11:30:00Z'),
        },
      ],
      skipDuplicates: true,
    });

    expect(result.count).toBe(0);

    await expect(
      prisma.schedules.count({
        where: {
          doctorId,
          specialtyId: specialtyAId,
          clinicId,
          scheduleDate,
          timeFrom: new Date('1970-01-01T11:00:00Z'),
          timeTo: new Date('1970-01-01T11:30:00Z'),
        },
      }),
    ).resolves.toBe(1);
  });
});
