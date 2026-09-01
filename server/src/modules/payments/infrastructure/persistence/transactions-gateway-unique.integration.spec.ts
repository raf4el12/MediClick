import { PrismaService } from '../../../../prisma/prisma.service.js';

/**
 * SDD-015 — G-06: `Transactions.gatewayId` no tiene unicidad en la base de
 * datos. `PrismaPaymentReconciliationRepository` reclama por `gatewayId` con
 * un `findFirst` (lectura) antes de `create` (escritura); sin constraint,
 * dos webhooks concurrentes con el mismo `gatewayId` nuevo pueden crear dos
 * filas duplicadas porque ninguno de los dos ve todavía la fila del otro.
 *
 * Este test crea dos transacciones concurrentes con el mismo `gatewayId`
 * directamente contra Prisma (sin pasar por el reconciliador) para probar
 * la barrera de base de datos de forma aislada, tal como pide el SDD:
 * "dos creates concurrentes de gatewayId".
 *
 * Requiere Postgres real: `RUN_DB_INTEGRATION=1 pnpm test -- transactions-gateway-unique.integration`
 */
const describeDatabase =
  process.env.RUN_DB_INTEGRATION === '1' ? describe : describe.skip;

describeDatabase(
  'Transactions.gatewayId unique constraint (PostgreSQL)',
  () => {
    const prisma = new PrismaService();
    const suffix = `${process.pid}-${Date.now()}`;
    const appointmentIds: number[] = [];
    let clinicId: number;
    let patientId: number;
    let scheduleId: number;

    beforeAll(async () => {
      await prisma.$connect();
      const clinic = await prisma.clinics.create({
        data: { name: `Gateway-unique clinic ${suffix}` },
      });
      clinicId = clinic.id;

      const patientUser = await prisma.users.create({
        data: {
          name: 'Gateway-unique patient',
          email: `gateway-unique-patient@${suffix}.test`,
          password: 'integration-test-only',
        },
      });
      const patientProfile = await prisma.profiles.create({
        data: { name: 'Gateway', lastName: 'Patient', userId: patientUser.id },
      });
      const patient = await prisma.patients.create({
        data: {
          profileId: patientProfile.id,
          emergencyContact: '999999999',
          bloodType: 'A+',
        },
      });
      patientId = patient.id;

      const doctorUser = await prisma.users.create({
        data: {
          name: 'Gateway-unique doctor',
          email: `gateway-unique-doctor@${suffix}.test`,
          password: 'integration-test-only',
          clinicId,
        },
      });
      const doctorProfile = await prisma.profiles.create({
        data: { name: 'Gateway', lastName: 'Doctor', userId: doctorUser.id },
      });
      const doctor = await prisma.doctors.create({
        data: {
          profileId: doctorProfile.id,
          licenseNumber: `GWU-${suffix}`,
          clinicId,
        },
      });
      const category = await prisma.categories.create({
        data: { name: `Gateway-unique category ${suffix}` },
      });
      const specialty = await prisma.specialties.create({
        data: {
          name: `Gateway-unique specialty ${suffix}`,
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
          scheduleDate: new Date('2099-06-02T00:00:00Z'),
          timeFrom: new Date('1970-01-01T09:00:00Z'),
          timeTo: new Date('1970-01-01T10:00:00Z'),
        },
      });
      scheduleId = schedule.id;
    });

    afterAll(async () => {
      await prisma.transactions.deleteMany({
        where: { appointmentId: { in: appointmentIds } },
      });
      await prisma.appointments.deleteMany({
        where: { id: { in: appointmentIds } },
      });
      await prisma.schedules.deleteMany({ where: { id: scheduleId } });
      await prisma.doctors.deleteMany({
        where: { licenseNumber: `GWU-${suffix}` },
      });
      await prisma.patients.deleteMany({ where: { id: patientId } });
      await prisma.profiles.deleteMany({
        where: { user: { email: { endsWith: `@${suffix}.test` } } },
      });
      await prisma.users.deleteMany({
        where: { email: { endsWith: `@${suffix}.test` } },
      });
      await prisma.specialties.deleteMany({
        where: { name: `Gateway-unique specialty ${suffix}` },
      });
      await prisma.categories.deleteMany({
        where: { name: `Gateway-unique category ${suffix}` },
      });
      await prisma.clinics.deleteMany({ where: { id: clinicId } });
      await prisma.onModuleDestroy();
    });

    const createAppointment = async () => {
      const appointment = await prisma.appointments.create({
        data: {
          patientId,
          scheduleId,
          clinicId,
          startTime: new Date('1970-01-01T09:00:00Z'),
          endTime: new Date('1970-01-01T09:30:00Z'),
          status: 'PENDING',
          paymentStatus: 'PENDING',
          amount: 100,
        },
      });
      appointmentIds.push(appointment.id);
      return appointment;
    };

    it('rejects a second transaction row with a gatewayId that already exists', async () => {
      const appointment = await createAppointment();
      const gatewayId = `mp-dup-${suffix}`;

      await prisma.transactions.create({
        data: {
          appointmentId: appointment.id,
          clinicId,
          amount: 100,
          currency: 'PEN',
          status: 'PAID',
          gatewayId,
        },
      });

      // Sin constraint única en la base de datos, esta segunda escritura con el
      // MISMO gatewayId hoy tiene éxito — lo que demuestra la ausencia de la
      // barrera. Después de la migración debe lanzar un error de unicidad.
      await expect(
        prisma.transactions.create({
          data: {
            appointmentId: appointment.id,
            clinicId,
            amount: 100,
            currency: 'PEN',
            status: 'PAID',
            gatewayId,
          },
        }),
      ).rejects.toMatchObject({ code: 'P2002' });

      await expect(
        prisma.transactions.count({ where: { gatewayId } }),
      ).resolves.toBe(1);
    });

    it('allows multiple transactions with a null gatewayId (preference created, payment not yet confirmed)', async () => {
      const appointmentA = await createAppointment();
      const appointmentB = await createAppointment();

      await prisma.transactions.create({
        data: {
          appointmentId: appointmentA.id,
          clinicId,
          amount: 100,
          currency: 'PEN',
          status: 'PENDING',
          gatewayId: null,
        },
      });
      await expect(
        prisma.transactions.create({
          data: {
            appointmentId: appointmentB.id,
            clinicId,
            amount: 100,
            currency: 'PEN',
            status: 'PENDING',
            gatewayId: null,
          },
        }),
      ).resolves.toMatchObject({ gatewayId: null });
    });

    it('allows exactly one concurrent create to win when two requests race with the same new gatewayId', async () => {
      const appointmentA = await createAppointment();
      const appointmentB = await createAppointment();
      const gatewayId = `mp-race-${suffix}`;

      const results = await Promise.allSettled([
        prisma.transactions.create({
          data: {
            appointmentId: appointmentA.id,
            clinicId,
            amount: 100,
            currency: 'PEN',
            status: 'PAID',
            gatewayId,
          },
        }),
        prisma.transactions.create({
          data: {
            appointmentId: appointmentB.id,
            clinicId,
            amount: 100,
            currency: 'PEN',
            status: 'PAID',
            gatewayId,
          },
        }),
      ]);

      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      const rejected = results.filter((r) => r.status === 'rejected');
      // Sin constraint, hoy AMBAS escrituras concurrentes tienen éxito.
      // Después de la migración, exactamente una debe ganar.
      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);
      await expect(
        prisma.transactions.count({ where: { gatewayId } }),
      ).resolves.toBe(1);
    });
  },
);
