import { PrismaService } from '../../../../prisma/prisma.service.js';
import { PrismaSpecialtyRepository } from './prisma-specialty.repository.js';
import { tenantStorage } from '../../../../prisma/tenant-context.js';

const describeDatabase =
  process.env.RUN_DB_INTEGRATION === '1' ? describe : describe.skip;

describeDatabase(
  'PrismaSpecialtyRepository — global and clinic filtering (PostgreSQL)',
  () => {
    const prisma = new PrismaService();
    const repository = new PrismaSpecialtyRepository(prisma);
    const suffix = `${process.pid}-${Date.now()}`;
    let clinicAId: number;
    let clinicBId: number;
    let categoryId: number;
    let globalSpecialtyId: number;
    let clinicASpecialtyId: number;
    let clinicBSpecialtyId: number;

    beforeAll(async () => {
      await prisma.$connect();
      const clinicA = await prisma.clinics.create({
        data: { name: `Clinic A ${suffix}` },
      });
      clinicAId = clinicA.id;

      const clinicB = await prisma.clinics.create({
        data: { name: `Clinic B ${suffix}` },
      });
      clinicBId = clinicB.id;

      const category = await prisma.categories.create({
        data: { name: `Category ${suffix}` },
      });
      categoryId = category.id;

      const globalSpec = await prisma.specialties.create({
        data: {
          name: `Global Spec ${suffix}`,
          categoryId,
          duration: 30,
          price: 100,
          clinicId: null,
        },
      });
      globalSpecialtyId = globalSpec.id;

      const clinicASpec = await prisma.specialties.create({
        data: {
          name: `Clinic A Spec ${suffix}`,
          categoryId,
          duration: 30,
          price: 120,
          clinicId: clinicAId,
        },
      });
      clinicASpecialtyId = clinicASpec.id;

      const clinicBSpec = await prisma.specialties.create({
        data: {
          name: `Clinic B Spec ${suffix}`,
          categoryId,
          duration: 30,
          price: 150,
          clinicId: clinicBId,
        },
      });
      clinicBSpecialtyId = clinicBSpec.id;
    });

    afterAll(async () => {
      await prisma.specialties.deleteMany({
        where: {
          id: {
            in: [globalSpecialtyId, clinicASpecialtyId, clinicBSpecialtyId],
          },
        },
      });
      await prisma.categories.deleteMany({
        where: { id: categoryId },
      });
      await prisma.clinics.deleteMany({
        where: { id: { in: [clinicAId, clinicBId] } },
      });
      await prisma.onModuleDestroy();
    });

    it('retorna especialidades globales + de la sede A bajo contexto de sede A', async () => {
      const result = await tenantStorage.run(clinicAId, async () => {
        return repository.findAllPaginated(
          { limit: 50, offset: 0 },
          categoryId,
          clinicAId,
        );
      });

      const returnedIds = result.rows.map((r) => r.id);
      expect(returnedIds).toContain(globalSpecialtyId);
      expect(returnedIds).toContain(clinicASpecialtyId);
      expect(returnedIds).not.toContain(clinicBSpecialtyId);
    });

    it('retorna especialidades globales + de la sede A sin contexto de sede pero con clinicId=A', async () => {
      const result = await repository.findAllPaginated(
        { limit: 50, offset: 0 },
        categoryId,
        clinicAId,
      );

      const returnedIds = result.rows.map((r) => r.id);
      expect(returnedIds).toContain(globalSpecialtyId);
      expect(returnedIds).toContain(clinicASpecialtyId);
      expect(returnedIds).not.toContain(clinicBSpecialtyId);
    });
  },
);
