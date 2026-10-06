import { PrismaService } from '../../../../prisma/prisma.service.js';
import { AppointmentStatus } from '../../../../shared/domain/enums/appointment-status.enum.js';
import { PrismaPublicDirectoryRepository } from './prisma-public-directory.repository.js';

const describeDatabase =
  process.env.RUN_DB_INTEGRATION === '1' ? describe : describe.skip;

describeDatabase('Directorio público de médicos (PostgreSQL)', () => {
  const prisma = new PrismaService();
  const repository = new PrismaPublicDirectoryRepository(prisma);

  const suffix = `public-dir-${process.pid}-${Date.now()}`;
  const page = { offset: 0, limit: 50 };
  const clinicIds: number[] = [];
  const doctorIds: Record<string, number> = {};
  const specialtyIds: Record<string, number> = {};
  const reviewIds: Record<string, number> = {};
  const appointmentIds: number[] = [];
  let scheduleId: number;
  let patientId: number;
  let activeClinic: number;
  let inactiveClinic: number;

  const createClinic = async (
    label: string,
    data: { isActive?: boolean; deleted?: boolean },
  ) => {
    const clinic = await prisma.clinics.create({
      data: {
        name: `Clinic ${label} ${suffix}`,
        address: `Calle ${label}`,
        timezone: 'America/Lima',
        ...data,
      },
    });
    clinicIds.push(clinic.id);
    return clinic.id;
  };

  const createDoctor = async (
    label: string,
    clinicId: number | null,
    data: { isActive?: boolean; deleted?: boolean } = {},
  ) => {
    const user = await prisma.users.create({
      data: {
        name: label,
        email: `${label}@${suffix}.test`,
        password: 'password',
        clinicId,
      },
    });
    const profile = await prisma.profiles.create({
      data: {
        name: 'Doctor',
        lastName: `${label}${suffix}`,
        userId: user.id,
        phone: '999111222',
      },
    });
    const doctor = await prisma.doctors.create({
      data: {
        profileId: profile.id,
        licenseNumber: `LIC-${label}-${suffix}`,
        clinicId,
        ...data,
      },
    });
    doctorIds[label] = doctor.id;
    return doctor.id;
  };

  const ours = (rows: { id: number }[]) =>
    rows
      .map((row) => row.id)
      .filter((id) => Object.values(doctorIds).includes(id));

  beforeAll(async () => {
    await prisma.$connect();
    activeClinic = await createClinic('activa', {});
    inactiveClinic = await createClinic('inactiva', { isActive: false });
    const deletedClinic = await createClinic('borrada', { deleted: true });

    const publicDoctor = await createDoctor('publico', activeClinic);
    await createDoctor('inactivo', activeClinic, { isActive: false });
    await createDoctor('borrado', activeClinic, { deleted: true });
    await createDoctor('sedeinactiva', inactiveClinic);
    await createDoctor('sedeborrada', deletedClinic);
    await createDoctor('sinsede', null);

    const category = await prisma.categories.create({
      data: { name: `Cat ${suffix}` },
    });
    for (const [label, data] of [
      ['vigente', {}],
      ['borrada', { deleted: true }],
      ['desvinculada', {}],
    ] as const) {
      const specialty = await prisma.specialties.create({
        data: {
          name: `Spec ${label} ${suffix}`,
          categoryId: category.id,
          duration: 30,
          price: 100,
          ...data,
        },
      });
      specialtyIds[label] = specialty.id;
    }
    await prisma.doctorsSpecialties.createMany({
      data: [
        { doctorId: publicDoctor, specialtyId: specialtyIds.vigente },
        { doctorId: publicDoctor, specialtyId: specialtyIds.borrada },
        {
          doctorId: publicDoctor,
          specialtyId: specialtyIds.desvinculada,
          deleted: true,
        },
      ],
    });

    const patientUser = await prisma.users.create({
      data: {
        name: 'Paciente',
        email: `patient@${suffix}.test`,
        password: 'password',
      },
    });
    const patientProfile = await prisma.profiles.create({
      data: {
        name: 'Paciente',
        lastName: 'Directorio',
        userId: patientUser.id,
      },
    });
    const patient = await prisma.patients.create({
      data: {
        profileId: patientProfile.id,
        emergencyContact: '999888777',
        bloodType: 'O+',
      },
    });
    patientId = patient.id;
    const schedule = await prisma.schedules.create({
      data: {
        doctorId: publicDoctor,
        specialtyId: specialtyIds.vigente,
        clinicId: activeClinic,
        scheduleDate: new Date('2026-01-10T00:00:00.000Z'),
        timeFrom: new Date('1970-01-01T08:00:00.000Z'),
        timeTo: new Date('1970-01-01T12:00:00.000Z'),
      },
    });
    scheduleId = schedule.id;
    for (const [label, isVisible, hour] of [
      ['visible', true, '08'],
      ['oculta', false, '09'],
    ] as const) {
      const appointment = await prisma.appointments.create({
        data: {
          patientId,
          scheduleId,
          clinicId: activeClinic,
          status: AppointmentStatus.COMPLETED,
          startTime: new Date(`1970-01-01T${hour}:00:00.000Z`),
          endTime: new Date(`1970-01-01T${hour}:30:00.000Z`),
        },
      });
      appointmentIds.push(appointment.id);
      const review = await prisma.reviews.create({
        data: {
          appointmentId: appointment.id,
          doctorId: publicDoctor,
          patientId,
          rating: isVisible ? 5 : 1,
          comment: label,
          isVisible,
          clinicId: activeClinic,
        },
      });
      reviewIds[label] = review.id;
    }
  });

  afterAll(async () => {
    try {
      await prisma.reviews.deleteMany({
        where: { id: { in: Object.values(reviewIds) } },
      });
      await prisma.appointments.deleteMany({
        where: { id: { in: appointmentIds } },
      });
      await prisma.schedules.deleteMany({ where: { id: scheduleId } });
      await prisma.patients.deleteMany({ where: { id: patientId } });
      await prisma.doctorsSpecialties.deleteMany({
        where: { doctorId: { in: Object.values(doctorIds) } },
      });
      await prisma.doctors.deleteMany({
        where: { id: { in: Object.values(doctorIds) } },
      });
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

  it('solo lista médicos activos, no borrados y de una sede activa y no borrada', async () => {
    const { rows } = await repository.listDoctors({}, page);

    expect(ours(rows)).toEqual([doctorIds.publico]);
  });

  it('el detalle de un médico que no es público es null', async () => {
    for (const label of [
      'inactivo',
      'borrado',
      'sedeinactiva',
      'sedeborrada',
      'sinsede',
    ]) {
      expect(await repository.findDoctor(doctorIds[label])).toBeNull();
    }
  });

  it('el detalle trae solo especialidades vigentes y la sede', async () => {
    const doctor = await repository.findDoctor(doctorIds.publico);

    expect(doctor?.specialties).toEqual([
      { id: specialtyIds.vigente, name: `Spec vigente ${suffix}` },
    ]);
    expect(doctor?.clinic).toEqual({
      id: activeClinic,
      name: `Clinic activa ${suffix}`,
      address: 'Calle activa',
    });
  });

  it('filtra por sede, especialidad y nombre', async () => {
    const bySede = await repository.listDoctors(
      { clinicId: activeClinic },
      page,
    );
    const byOtherSede = await repository.listDoctors(
      { clinicId: inactiveClinic },
      page,
    );
    const bySpecialty = await repository.listDoctors(
      { specialtyId: specialtyIds.vigente },
      page,
    );
    const byUnlinked = await repository.listDoctors(
      { specialtyId: specialtyIds.desvinculada },
      page,
    );
    const byName = await repository.listDoctors(
      { searchValue: `PUBLICO${suffix}` },
      page,
    );

    expect(ours(bySede.rows)).toEqual([doctorIds.publico]);
    expect(ours(byOtherSede.rows)).toEqual([]);
    expect(ours(bySpecialty.rows)).toEqual([doctorIds.publico]);
    expect(ours(byUnlinked.rows)).toEqual([]);
    expect(ours(byName.rows)).toEqual([doctorIds.publico]);
  });

  it('las reseñas públicas excluyen las ocultas', async () => {
    const { rows, totalRows } = await repository.listVisibleReviews(
      doctorIds.publico,
      page,
    );

    expect(rows.map((row) => row.id)).toEqual([reviewIds.visible]);
    expect(totalRows).toBe(1);
  });
});
