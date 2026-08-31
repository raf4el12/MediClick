import { PrismaService } from '../../../../prisma/prisma.service.js';
import { PrismaPatientRecordQuery } from './prisma-patient-record.query.js';

const describeDatabase =
  process.env.RUN_DB_INTEGRATION === '1' ? describe : describe.skip;

describeDatabase('PrismaPatientRecordQuery (PostgreSQL)', () => {
  const prisma = new PrismaService();
  const query = new PrismaPatientRecordQuery(prisma);
  const suffix = `${process.pid}-${Date.now()}`;
  const ids: Record<string, number[]> = {
    clinics: [],
    users: [],
    profiles: [],
    patients: [],
    doctors: [],
    categories: [],
    specialties: [],
    schedules: [],
    appointments: [],
  };

  let patientId: number;
  let patientUserId: number;
  let clinicOneId: number;
  let doctorOneUserId: number;
  let unrelatedDoctorUserId: number;

  beforeAll(async () => {
    await prisma.$connect();

    const [clinicOne, clinicTwo] = await Promise.all([
      prisma.clinics.create({ data: { name: `Tenant A ${suffix}` } }),
      prisma.clinics.create({ data: { name: `Tenant B ${suffix}` } }),
    ]);
    ids.clinics.push(clinicOne.id, clinicTwo.id);
    clinicOneId = clinicOne.id;

    const createIdentity = async (
      label: string,
      clinicId: number | null,
    ) => {
      const user = await prisma.users.create({
        data: {
          name: label,
          email: `${label.toLowerCase().replaceAll(' ', '-')}@${suffix}.test`,
          password: 'integration-test-only',
          clinicId,
        },
      });
      ids.users.push(user.id);
      const profile = await prisma.profiles.create({
        data: { name: label, lastName: 'Test', userId: user.id },
      });
      ids.profiles.push(profile.id);
      return { user, profile };
    };

    const patientIdentity = await createIdentity('Patient', null);
    patientUserId = patientIdentity.user.id;
    const patient = await prisma.patients.create({
      data: {
        profileId: patientIdentity.profile.id,
        emergencyContact: '999999999',
        bloodType: 'O+',
      },
    });
    ids.patients.push(patient.id);
    patientId = patient.id;

    const doctorOneIdentity = await createIdentity('Doctor One', clinicOne.id);
    doctorOneUserId = doctorOneIdentity.user.id;
    const doctorOne = await prisma.doctors.create({
      data: {
        profileId: doctorOneIdentity.profile.id,
        licenseNumber: `LIC-A-${suffix}`,
        clinicId: clinicOne.id,
      },
    });
    ids.doctors.push(doctorOne.id);

    const doctorTwoIdentity = await createIdentity('Doctor Two', clinicTwo.id);
    const doctorTwo = await prisma.doctors.create({
      data: {
        profileId: doctorTwoIdentity.profile.id,
        licenseNumber: `LIC-B-${suffix}`,
        clinicId: clinicTwo.id,
      },
    });
    ids.doctors.push(doctorTwo.id);

    const unrelatedIdentity = await createIdentity(
      'Doctor Unrelated',
      clinicOne.id,
    );
    unrelatedDoctorUserId = unrelatedIdentity.user.id;
    const unrelatedDoctor = await prisma.doctors.create({
      data: {
        profileId: unrelatedIdentity.profile.id,
        licenseNumber: `LIC-U-${suffix}`,
        clinicId: clinicOne.id,
      },
    });
    ids.doctors.push(unrelatedDoctor.id);

    const category = await prisma.categories.create({
      data: { name: `Category ${suffix}` },
    });
    ids.categories.push(category.id);
    const specialty = await prisma.specialties.create({
      data: {
        name: `Specialty ${suffix}`,
        categoryId: category.id,
        duration: 30,
      },
    });
    ids.specialties.push(specialty.id);

    const [scheduleOne, scheduleTwo] = await Promise.all([
      prisma.schedules.create({
        data: {
          doctorId: doctorOne.id,
          specialtyId: specialty.id,
          clinicId: clinicOne.id,
          scheduleDate: new Date('2026-09-01T00:00:00Z'),
          timeFrom: new Date('1970-01-01T09:00:00Z'),
          timeTo: new Date('1970-01-01T10:00:00Z'),
        },
      }),
      prisma.schedules.create({
        data: {
          doctorId: doctorTwo.id,
          specialtyId: specialty.id,
          clinicId: clinicTwo.id,
          scheduleDate: new Date('2026-09-02T00:00:00Z'),
          timeFrom: new Date('1970-01-01T09:00:00Z'),
          timeTo: new Date('1970-01-01T10:00:00Z'),
        },
      }),
    ]);
    ids.schedules.push(scheduleOne.id, scheduleTwo.id);

    const [appointmentOne, appointmentTwo] = await Promise.all([
      prisma.appointments.create({
        data: {
          patientId: patient.id,
          scheduleId: scheduleOne.id,
          clinicId: clinicOne.id,
          startTime: new Date('1970-01-01T09:00:00Z'),
          endTime: new Date('1970-01-01T09:30:00Z'),
          status: 'CONFIRMED',
        },
      }),
      prisma.appointments.create({
        data: {
          patientId: patient.id,
          scheduleId: scheduleTwo.id,
          clinicId: clinicTwo.id,
          startTime: new Date('1970-01-01T09:00:00Z'),
          endTime: new Date('1970-01-01T09:30:00Z'),
          status: 'CONFIRMED',
        },
      }),
    ]);
    ids.appointments.push(appointmentOne.id, appointmentTwo.id);

    await Promise.all([
      prisma.medicalHistory.create({
        data: {
          patientId: patient.id,
          clinicId: clinicOne.id,
          condition: 'Historia sede 1',
        },
      }),
      prisma.medicalHistory.create({
        data: {
          patientId: patient.id,
          clinicId: clinicTwo.id,
          condition: 'Historia sede 2',
        },
      }),
      prisma.clinicalNotes.create({
        data: {
          appointmentId: appointmentOne.id,
          clinicId: clinicOne.id,
          diagnosis: 'Diagnóstico sede 1',
        },
      }),
      prisma.clinicalNotes.create({
        data: {
          appointmentId: appointmentTwo.id,
          clinicId: clinicTwo.id,
          diagnosis: 'Diagnóstico sede 2',
        },
      }),
    ]);
  });

  afterAll(async () => {
    await prisma.clinicalNotes.deleteMany({
      where: { appointmentId: { in: ids.appointments } },
    });
    await prisma.medicalHistory.deleteMany({ where: { patientId } });
    await prisma.appointments.deleteMany({
      where: { id: { in: ids.appointments } },
    });
    await prisma.schedules.deleteMany({ where: { id: { in: ids.schedules } } });
    await prisma.doctors.deleteMany({ where: { id: { in: ids.doctors } } });
    await prisma.patients.deleteMany({ where: { id: { in: ids.patients } } });
    await prisma.profiles.deleteMany({ where: { id: { in: ids.profiles } } });
    await prisma.users.deleteMany({ where: { id: { in: ids.users } } });
    await prisma.specialties.deleteMany({
      where: { id: { in: ids.specialties } },
    });
    await prisma.categories.deleteMany({
      where: { id: { in: ids.categories } },
    });
    await prisma.clinics.deleteMany({ where: { id: { in: ids.clinics } } });
    await prisma.onModuleDestroy();
  });

  it('isolates staff and doctor views while preserving patient/global access', async () => {
    const clinicView = await query.getPatientRecord(patientId, {
      kind: 'CLINIC',
      clinicId: clinicOneId,
    });
    expect(clinicView?.medicalHistory?.map((item) => item.condition)).toEqual([
      'Historia sede 1',
    ]);
    expect(clinicView?.appointments?.map((item) => item.id)).toHaveLength(1);
    expect(clinicView?.appointments?.[0].clinicalNotes).toEqual([
      { diagnosis: 'Diagnóstico sede 1', plan: undefined },
    ]);

    const doctorView = await query.getPatientRecord(patientId, {
      kind: 'CLINIC',
      clinicId: clinicOneId,
      doctorUserId: doctorOneUserId,
    });
    expect(doctorView?.appointments).toHaveLength(1);

    const unrelatedDoctorView = await query.getPatientRecord(patientId, {
      kind: 'CLINIC',
      clinicId: clinicOneId,
      doctorUserId: unrelatedDoctorUserId,
    });
    expect(unrelatedDoctorView).toBeNull();

    const ownPatientId = await query.getPatientIdByUserId(patientUserId);
    expect(ownPatientId).toBe(patientId);
    const patientView = await query.getPatientRecord(patientId, {
      kind: 'PATIENT',
    });
    const globalView = await query.getPatientRecord(patientId, {
      kind: 'GLOBAL',
    });
    expect(patientView?.appointments).toHaveLength(2);
    expect(globalView?.medicalHistory).toHaveLength(2);
  });
});
