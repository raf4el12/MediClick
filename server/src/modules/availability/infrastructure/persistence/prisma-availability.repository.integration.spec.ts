import { PrismaService } from '../../../../prisma/prisma.service.js';
import { DayOfWeek } from '../../../../shared/domain/enums/day-of-week.enum.js';
import { AvailabilityType } from '../../../../shared/domain/enums/availability-type.enum.js';
import { PrismaAvailabilityRepository } from './prisma-availability.repository.js';

const describeDatabase =
  process.env.RUN_DB_INTEGRATION === '1' ? describe : describe.skip;

describeDatabase(
  'PrismaAvailabilityRepository replacement (PostgreSQL)',
  () => {
    const prisma = new PrismaService();
    const repository = new PrismaAvailabilityRepository(prisma);
    const suffix = `${process.pid}-${Date.now()}`;
    let clinicId: number;
    let doctorId: number;
    let specialtyAId: number;
    let specialtyBId: number;

    const availability = (
      specialtyId: number,
      clinicIdOverride = clinicId,
    ) => ({
      doctorId,
      specialtyId,
      startDate: new Date('2099-01-01T00:00:00.000Z'),
      endDate: new Date('2099-12-31T00:00:00.000Z'),
      dayOfWeek: DayOfWeek.MONDAY,
      timeFrom: new Date('1970-01-01T08:00:00.000Z'),
      timeTo: new Date('1970-01-01T12:00:00.000Z'),
      type: AvailabilityType.REGULAR,
      clinicId: clinicIdOverride,
    });

    beforeAll(async () => {
      await prisma.$connect();
      const clinic = await prisma.clinics.create({
        data: { name: `Availability clinic ${suffix}` },
      });
      clinicId = clinic.id;
      const user = await prisma.users.create({
        data: {
          name: 'Availability doctor',
          email: `availability-doctor@${suffix}.test`,
          password: 'integration-test-only',
          clinicId,
        },
      });
      const profile = await prisma.profiles.create({
        data: {
          name: 'Availability',
          lastName: 'Doctor',
          userId: user.id,
        },
      });
      const doctor = await prisma.doctors.create({
        data: {
          profileId: profile.id,
          licenseNumber: `AVL-${suffix}`,
          clinicId,
        },
      });
      doctorId = doctor.id;
      const category = await prisma.categories.create({
        data: { name: `Availability category ${suffix}` },
      });
      const specialtyA = await prisma.specialties.create({
        data: {
          name: `Availability A ${suffix}`,
          categoryId: category.id,
          duration: 30,
        },
      });
      const specialtyB = await prisma.specialties.create({
        data: {
          name: `Availability B ${suffix}`,
          categoryId: category.id,
          duration: 30,
        },
      });
      specialtyAId = specialtyA.id;
      specialtyBId = specialtyB.id;
      await prisma.doctorsSpecialties.createMany({
        data: [
          { doctorId, specialtyId: specialtyAId },
          { doctorId, specialtyId: specialtyBId },
        ],
      });
      await prisma.availability.createMany({
        data: [availability(specialtyAId), availability(specialtyBId)],
      });
    });

    afterAll(async () => {
      await prisma.availability.deleteMany({ where: { doctorId } });
      await prisma.doctorsSpecialties.deleteMany({ where: { doctorId } });
      await prisma.doctors.deleteMany({ where: { id: doctorId } });
      await prisma.profiles.deleteMany({
        where: { user: { email: `availability-doctor@${suffix}.test` } },
      });
      await prisma.users.deleteMany({
        where: { email: `availability-doctor@${suffix}.test` },
      });
      await prisma.specialties.deleteMany({
        where: { id: { in: [specialtyAId, specialtyBId] } },
      });
      await prisma.categories.deleteMany({
        where: { name: `Availability category ${suffix}` },
      });
      await prisma.clinics.deleteMany({ where: { id: clinicId } });
      await prisma.onModuleDestroy();
    });

    it('revierte la desactivación si falla una creación y conserva otra especialidad', async () => {
      await expect(
        repository.replaceForDoctorSpecialty(doctorId, specialtyAId, [
          availability(specialtyAId),
          availability(specialtyAId, 999_999_999),
        ]),
      ).rejects.toThrow();

      const active = await prisma.availability.findMany({
        where: { doctorId, isAvailable: true },
        select: { specialtyId: true },
        orderBy: { specialtyId: 'asc' },
      });

      expect(active).toEqual([
        { specialtyId: specialtyAId },
        { specialtyId: specialtyBId },
      ]);
    });

    it('deja un único conjunto activo si dos reemplazos compiten', async () => {
      const laterStart = {
        ...availability(specialtyAId),
        timeFrom: new Date('1970-01-01T09:00:00.000Z'),
        timeTo: new Date('1970-01-01T13:00:00.000Z'),
      };
      const results = await Promise.allSettled([
        repository.replaceForDoctorSpecialty(doctorId, specialtyAId, [
          availability(specialtyAId),
        ]),
        repository.replaceForDoctorSpecialty(doctorId, specialtyAId, [
          laterStart,
        ]),
      ]);

      expect(
        results.filter((result) => result.status === 'fulfilled'),
      ).toHaveLength(2);
      await expect(
        prisma.availability.count({
          where: { doctorId, specialtyId: specialtyAId, isAvailable: true },
        }),
      ).resolves.toBe(1);
      await expect(
        prisma.availability.count({
          where: { doctorId, specialtyId: specialtyBId, isAvailable: true },
        }),
      ).resolves.toBe(1);
    });
  },
);
