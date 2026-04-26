import {
  PrismaClient,
  AppointmentStatus,
  PaymentStatus,
  PaymentMethod,
  DayOfWeek,
  AvailabilityType,
  ScheduleBlockType,
  NotificationType,
  NotificationChannel,
  MedicalHistoryStatus,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import 'dotenv/config';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

/* ─── Helpers ─── */
const PASSWORD = '123456';

/** Build a Date at a specific hour (UTC-5 Peru approximation) */
function timeOnly(h: number, m = 0): Date {
  const d = new Date('2000-01-01T00:00:00Z');
  d.setUTCHours(h, m, 0, 0);
  return d;
}

/** Build a date N days from today at 00:00 UTC */
function daysFromNow(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(0, 0, 0, 0);
  return d;
}

function today(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function dateAtHour(base: Date, h: number, m = 0): Date {
  const d = new Date(base);
  d.setHours(h, m, 0, 0);
  return d;
}

/* ─── Clean ─── */
async function clean() {
  console.log('🧹 Limpiando datos anteriores...');
  // Delete in reverse dependency order
  await prisma.notifications.deleteMany();
  await prisma.medicalHistory.deleteMany();
  await prisma.reviews.deleteMany();
  await prisma.transactions.deleteMany();
  await prisma.prescriptionItems.deleteMany();
  await prisma.prescriptions.deleteMany();
  await prisma.clinicalNotes.deleteMany();
  await prisma.appointments.deleteMany();
  await prisma.schedules.deleteMany();
  await prisma.scheduleBlocks.deleteMany();
  await prisma.availability.deleteMany();
  await prisma.doctorsSpecialties.deleteMany();
  await prisma.doctors.deleteMany();
  await prisma.patients.deleteMany();
  await prisma.profiles.deleteMany();
  await prisma.users.deleteMany();
  await prisma.rolePermissions.deleteMany();
  await prisma.permissions.deleteMany();
  await prisma.roles.deleteMany();
  await prisma.specialties.deleteMany();
  await prisma.categories.deleteMany();
  await prisma.holidays.deleteMany();
  await prisma.clinics.deleteMany();
  console.log('✅ Datos anteriores eliminados.');
}

/* ─── Main ─── */
async function main() {
  console.log('🌱 Iniciando seed de la base de datos...\n');

  await clean();

  const hashedPassword = await bcrypt.hash(PASSWORD, 10);

  // ════════════════════════════════════════════════════
  // 1. CLINICS
  // ════════════════════════════════════════════════════
  console.log('🏥 Creando clínicas...');

  const clinicLima = await prisma.clinics.create({
    data: {
      name: 'MediClick Sede Lima',
      address: 'Av. Javier Prado Este 1234, San Isidro, Lima',
      phone: '+5114567890',
      email: 'lima@mediclick.com',
      timezone: 'America/Lima',
      currency: 'PEN',
    },
  });

  const clinicArequipa = await prisma.clinics.create({
    data: {
      name: 'MediClick Sede Arequipa',
      address: 'Calle Mercaderes 456, Cercado, Arequipa',
      phone: '+5154321098',
      email: 'arequipa@mediclick.com',
      timezone: 'America/Lima',
      currency: 'PEN',
    },
  });

  // ════════════════════════════════════════════════════
  // 2. CATEGORIES (per clinic)
  // ════════════════════════════════════════════════════
  console.log('📂 Creando categorías...');

  const catCardiologia = await prisma.categories.create({
    data: {
      name: 'Cardiología',
      description: 'Especialidades del corazón y sistema cardiovascular',
      icon: 'ri-heart-pulse-line',
      color: '#ef4444',
      order: 1,
      clinicId: clinicLima.id,
    },
  });

  const catDermatologia = await prisma.categories.create({
    data: {
      name: 'Dermatología',
      description: 'Especialidades de la piel, cabello y uñas',
      icon: 'ri-sun-line',
      color: '#3b82f6',
      order: 2,
      clinicId: clinicLima.id,
    },
  });

  const catMedGeneral = await prisma.categories.create({
    data: {
      name: 'Medicina General',
      description: 'Consultas generales y chequeos preventivos',
      icon: 'ri-stethoscope-line',
      color: '#10b981',
      order: 3,
      clinicId: clinicLima.id,
    },
  });

  const catPediatria = await prisma.categories.create({
    data: {
      name: 'Pediatría',
      description: 'Atención médica para niños y adolescentes',
      icon: 'ri-user-heart-line',
      color: '#f59e0b',
      order: 4,
      clinicId: clinicLima.id,
    },
  });

  // Arequipa categories
  const catMedGeneralAQP = await prisma.categories.create({
    data: {
      name: 'Medicina General',
      description: 'Consultas generales',
      icon: 'ri-stethoscope-line',
      color: '#10b981',
      order: 1,
      clinicId: clinicArequipa.id,
    },
  });

  // ════════════════════════════════════════════════════
  // 3. SPECIALTIES
  // ════════════════════════════════════════════════════
  console.log('🩺 Creando especialidades...');

  const specCardioGeneral = await prisma.specialties.create({
    data: {
      categoryId: catCardiologia.id,
      name: 'Cardiología General',
      description: 'Evaluación y diagnóstico de enfermedades cardiovasculares',
      duration: 30,
      bufferMinutes: 10,
      price: 150.0,
      icon: 'ri-heart-pulse-line',
      clinicId: clinicLima.id,
    },
  });

  const specEcocardiografia = await prisma.specialties.create({
    data: {
      categoryId: catCardiologia.id,
      name: 'Ecocardiografía',
      description: 'Estudio por ultrasonido del corazón',
      duration: 45,
      bufferMinutes: 15,
      price: 250.0,
      icon: 'ri-pulse-line',
      clinicId: clinicLima.id,
    },
  });

  const specDermaClinica = await prisma.specialties.create({
    data: {
      categoryId: catDermatologia.id,
      name: 'Dermatología Clínica',
      description: 'Diagnóstico y tratamiento de enfermedades de la piel',
      duration: 20,
      bufferMinutes: 5,
      price: 120.0,
      icon: 'ri-sun-line',
      clinicId: clinicLima.id,
    },
  });

  const specConsultaGeneral = await prisma.specialties.create({
    data: {
      categoryId: catMedGeneral.id,
      name: 'Consulta General',
      description: 'Consulta médica de atención primaria',
      duration: 20,
      bufferMinutes: 5,
      price: 80.0,
      icon: 'ri-stethoscope-line',
      clinicId: clinicLima.id,
    },
  });

  const specPediatria = await prisma.specialties.create({
    data: {
      categoryId: catPediatria.id,
      name: 'Consulta Pediátrica',
      description: 'Atención integral del niño y adolescente',
      duration: 30,
      bufferMinutes: 10,
      price: 100.0,
      icon: 'ri-user-heart-line',
      clinicId: clinicLima.id,
    },
  });

  // Arequipa specialty
  const specConsultaAQP = await prisma.specialties.create({
    data: {
      categoryId: catMedGeneralAQP.id,
      name: 'Consulta General',
      description: 'Consulta médica general',
      duration: 20,
      bufferMinutes: 5,
      price: 60.0,
      icon: 'ri-stethoscope-line',
      clinicId: clinicArequipa.id,
    },
  });

  // ════════════════════════════════════════════════════
  // 3.5  ROLES & PERMISSIONS (PBAC)
  // ════════════════════════════════════════════════════
  console.log('🔐 Creando roles y permisos...');

  // ── All subjects in the system ──
  const subjects = [
    'APPOINTMENTS', 'AVAILABILITY', 'CLINICS', 'USERS', 'CATEGORIES',
    'CLINICAL_NOTES', 'REPORTS', 'NOTIFICATIONS', 'MEDICAL_HISTORY',
    'PRESCRIPTIONS', 'DOCTORS', 'PATIENTS', 'SPECIALTIES',
    'SCHEDULE_BLOCKS', 'SCHEDULES', 'ROLES', 'HOLIDAYS',
  ] as const;
  const actions = ['CREATE', 'READ', 'UPDATE', 'DELETE', 'MANAGE'] as const;

  // Create all permission combinations + MANAGE:ALL wildcard
  const permissionData: { action: string; subject: string; description: string }[] = [];
  for (const subject of subjects) {
    for (const action of actions) {
      permissionData.push({
        action,
        subject,
        description: `${action} ${subject}`,
      });
    }
  }
  permissionData.push({
    action: 'MANAGE',
    subject: 'ALL',
    description: 'Super-admin wildcard — grants every permission',
  });

  await prisma.permissions.createMany({ data: permissionData });

  const allPerms = await prisma.permissions.findMany();
  const permMap: Record<string, number> = {};
  for (const p of allPerms) {
    permMap[`${p.action}:${p.subject}`] = p.id;
  }

  // ── System roles ──
  const adminRole = await prisma.roles.create({
    data: { name: 'ADMIN', description: 'Administrador del sistema', isSystem: true },
  });
  const doctorRole = await prisma.roles.create({
    data: { name: 'DOCTOR', description: 'Médico', isSystem: true },
  });
  const receptionistRole = await prisma.roles.create({
    data: { name: 'RECEPTIONIST', description: 'Recepcionista', isSystem: true },
  });
  const patientRole = await prisma.roles.create({
    data: { name: 'PATIENT', description: 'Paciente', isSystem: true },
  });

  // ── Role → Permission mappings ──
  const rolePermMap: Record<string, string[]> = {
    ADMIN: ['MANAGE:ALL'],
    DOCTOR: [
      'READ:APPOINTMENTS', 'CREATE:APPOINTMENTS', 'UPDATE:APPOINTMENTS',
      'READ:PATIENTS',
      'CREATE:CLINICAL_NOTES', 'READ:CLINICAL_NOTES',
      'CREATE:PRESCRIPTIONS', 'READ:PRESCRIPTIONS',
      'READ:MEDICAL_HISTORY', 'CREATE:MEDICAL_HISTORY', 'UPDATE:MEDICAL_HISTORY',
      'READ:SCHEDULES',
      'READ:AVAILABILITY',
      'READ:SCHEDULE_BLOCKS',
      'READ:NOTIFICATIONS', 'UPDATE:NOTIFICATIONS',
    ],
    RECEPTIONIST: [
      'READ:APPOINTMENTS', 'CREATE:APPOINTMENTS', 'UPDATE:APPOINTMENTS',
      'READ:PATIENTS', 'CREATE:PATIENTS', 'UPDATE:PATIENTS',
      'READ:DOCTORS',
      'READ:SCHEDULES', 'CREATE:SCHEDULES',
      'READ:AVAILABILITY', 'CREATE:AVAILABILITY', 'UPDATE:AVAILABILITY', 'DELETE:AVAILABILITY',
      'READ:SCHEDULE_BLOCKS', 'CREATE:SCHEDULE_BLOCKS', 'UPDATE:SCHEDULE_BLOCKS', 'DELETE:SCHEDULE_BLOCKS',
      'READ:HOLIDAYS', 'CREATE:HOLIDAYS', 'UPDATE:HOLIDAYS', 'DELETE:HOLIDAYS',
      'READ:NOTIFICATIONS', 'CREATE:NOTIFICATIONS', 'UPDATE:NOTIFICATIONS',
      'READ:REPORTS',
    ],
    PATIENT: [
      'READ:APPOINTMENTS', 'CREATE:APPOINTMENTS',
      'READ:CLINICS',
      'READ:CATEGORIES',
      'READ:SPECIALTIES',
      'READ:DOCTORS',
      'READ:SCHEDULES',
      'READ:PATIENTS',
      'READ:CLINICAL_NOTES',
      'READ:PRESCRIPTIONS',
      'READ:MEDICAL_HISTORY',
      'READ:NOTIFICATIONS', 'UPDATE:NOTIFICATIONS',
    ],
  };

  const roleIdMap: Record<string, number> = {
    ADMIN: adminRole.id,
    DOCTOR: doctorRole.id,
    RECEPTIONIST: receptionistRole.id,
    PATIENT: patientRole.id,
  };

  const rpData: { roleId: number; permissionId: number }[] = [];
  for (const [roleName, perms] of Object.entries(rolePermMap)) {
    for (const perm of perms) {
      const permId = permMap[perm];
      if (permId) {
        rpData.push({ roleId: roleIdMap[roleName]!, permissionId: permId });
      }
    }
  }
  await prisma.rolePermissions.createMany({ data: rpData });

  console.log(
    `✅ ${Object.keys(roleIdMap).length} roles, ${allPerms.length} permisos, ${rpData.length} asignaciones creadas.`,
  );

  // ════════════════════════════════════════════════════
  // 4. USERS, PROFILES, DOCTORS, PATIENTS
  // ════════════════════════════════════════════════════
  console.log('👤 Creando usuarios...');

  const roleIds: Record<string, number> = roleIdMap;

  // --- Super Admin (no clinicId) ---
  const adminUser = await prisma.users.create({
    data: {
      name: 'Super Admin',
      email: 'admin@mediclick.com',
      password: hashedPassword,
      roleId: roleIds['ADMIN'],
      isActive: true,
      validateEmail: true,
    },
  });

  await prisma.profiles.create({
    data: {
      name: 'Carlos',
      lastName: 'Mendoza',
      userId: adminUser.id,
      phone: '+51999000001',
      typeDocument: 'DNI',
      numberDocument: '70000001',
      country: 'Perú',
      state: 'Lima',
    },
  });

  // --- Clinic Admin (Lima) ---
  const clinicAdminUser = await prisma.users.create({
    data: {
      name: 'Admin Lima',
      email: 'adminlima@mediclick.com',
      password: hashedPassword,
      roleId: roleIds['ADMIN'],
      isActive: true,
      validateEmail: true,
      clinicId: clinicLima.id,
    },
  });

  await prisma.profiles.create({
    data: {
      name: 'María',
      lastName: 'Torres',
      userId: clinicAdminUser.id,
      phone: '+51999000002',
      typeDocument: 'DNI',
      numberDocument: '70000002',
      country: 'Perú',
      state: 'Lima',
    },
  });

  // --- Receptionist (Lima) ---
  const receptionistUser = await prisma.users.create({
    data: {
      name: 'Recepcionista Lima',
      email: 'recepcion@mediclick.com',
      password: hashedPassword,
      roleId: roleIds['RECEPTIONIST'],
      isActive: true,
      validateEmail: true,
      clinicId: clinicLima.id,
    },
  });

  await prisma.profiles.create({
    data: {
      name: 'Ana',
      lastName: 'García',
      userId: receptionistUser.id,
      phone: '+51999000003',
      typeDocument: 'DNI',
      numberDocument: '70000003',
      country: 'Perú',
      state: 'Lima',
    },
  });

  // --- Doctor 1: Cardiólogo (Lima) ---
  const doctor1User = await prisma.users.create({
    data: {
      name: 'Dr. Ramírez',
      email: 'ramirez@mediclick.com',
      password: hashedPassword,
      roleId: roleIds['DOCTOR'],
      isActive: true,
      validateEmail: true,
      clinicId: clinicLima.id,
    },
  });

  const doctor1Profile = await prisma.profiles.create({
    data: {
      name: 'Roberto',
      lastName: 'Ramírez',
      userId: doctor1User.id,
      phone: '+51987654321',
      gender: 'M',
      typeDocument: 'DNI',
      numberDocument: '40123456',
      address: 'Av. Arequipa 2580, Lince, Lima',
      country: 'Perú',
      state: 'Lima',
    },
  });

  const doctor1 = await prisma.doctors.create({
    data: {
      profileId: doctor1Profile.id,
      licenseNumber: '54321',
      resume: 'Cardiólogo con 15 años de experiencia. Subespecialidad en ecocardiografía e insuficiencia cardíaca.',
      maxOverbookPerDay: 2,
      clinicId: clinicLima.id,
      specialties: {
        create: [
          { specialtyId: specCardioGeneral.id },
          { specialtyId: specEcocardiografia.id },
        ],
      },
    },
  });

  // --- Doctor 2: Dermatóloga + Medicina General (Lima) ---
  const doctor2User = await prisma.users.create({
    data: {
      name: 'Dra. Flores',
      email: 'flores@mediclick.com',
      password: hashedPassword,
      roleId: roleIds['DOCTOR'],
      isActive: true,
      validateEmail: true,
      clinicId: clinicLima.id,
    },
  });

  const doctor2Profile = await prisma.profiles.create({
    data: {
      name: 'Lucía',
      lastName: 'Flores',
      userId: doctor2User.id,
      phone: '+51987654322',
      gender: 'F',
      typeDocument: 'DNI',
      numberDocument: '40123457',
      address: 'Jr. Camaná 890, Cercado de Lima',
      country: 'Perú',
      state: 'Lima',
    },
  });

  const doctor2 = await prisma.doctors.create({
    data: {
      profileId: doctor2Profile.id,
      licenseNumber: '67890',
      resume: 'Dermatóloga especialista en dermatología clínica y estética. También brinda consultas de medicina general.',
      maxOverbookPerDay: 1,
      clinicId: clinicLima.id,
      specialties: {
        create: [
          { specialtyId: specDermaClinica.id },
          { specialtyId: specConsultaGeneral.id },
        ],
      },
    },
  });

  // --- Doctor 3: Medicina General (Arequipa) ---
  const doctor3User = await prisma.users.create({
    data: {
      name: 'Dr. Chávez',
      email: 'chavez@mediclick.com',
      password: hashedPassword,
      roleId: roleIds['DOCTOR'],
      isActive: true,
      validateEmail: true,
      clinicId: clinicArequipa.id,
    },
  });

  const doctor3Profile = await prisma.profiles.create({
    data: {
      name: 'Fernando',
      lastName: 'Chávez',
      userId: doctor3User.id,
      phone: '+51987654323',
      gender: 'M',
      typeDocument: 'DNI',
      numberDocument: '40123458',
      country: 'Perú',
      state: 'Arequipa',
    },
  });

  const doctor3 = await prisma.doctors.create({
    data: {
      profileId: doctor3Profile.id,
      licenseNumber: '11223',
      resume: 'Médico general con 10 años de experiencia en atención primaria.',
      maxOverbookPerDay: 3,
      clinicId: clinicArequipa.id,
      specialties: {
        create: [{ specialtyId: specConsultaAQP.id }],
      },
    },
  });

  // --- Patient 1 ---
  const patient1User = await prisma.users.create({
    data: {
      name: 'Juan Pérez',
      email: 'juan@gmail.com',
      password: hashedPassword,
      roleId: roleIds['PATIENT'],
      isActive: true,
      validateEmail: true,
    },
  });

  const patient1Profile = await prisma.profiles.create({
    data: {
      name: 'Juan',
      lastName: 'Pérez',
      userId: patient1User.id,
      phone: '+51912345678',
      gender: 'M',
      birthday: new Date('1985-06-15'),
      typeDocument: 'DNI',
      numberDocument: '45678901',
      address: 'Jr. Huallaga 234, Lima',
      country: 'Perú',
      state: 'Lima',
    },
  });

  const patient1 = await prisma.patients.create({
    data: {
      profileId: patient1Profile.id,
      emergencyContact: '+51999111222',
      bloodType: 'O+',
      allergies: 'Penicilina, Sulfas',
      chronicConditions: 'Hipertensión arterial',
    },
  });

  // --- Patient 2 ---
  const patient2User = await prisma.users.create({
    data: {
      name: 'María López',
      email: 'maria@gmail.com',
      password: hashedPassword,
      roleId: roleIds['PATIENT'],
      isActive: true,
      validateEmail: true,
    },
  });

  const patient2Profile = await prisma.profiles.create({
    data: {
      name: 'María',
      lastName: 'López',
      userId: patient2User.id,
      phone: '+51998877665',
      gender: 'F',
      birthday: new Date('1992-03-22'),
      typeDocument: 'DNI',
      numberDocument: '45678902',
      address: 'Av. Brasil 1500, Jesús María, Lima',
      country: 'Perú',
      state: 'Lima',
    },
  });

  const patient2 = await prisma.patients.create({
    data: {
      profileId: patient2Profile.id,
      emergencyContact: '+51999333444',
      bloodType: 'A+',
      allergies: null,
      chronicConditions: 'Asma leve',
    },
  });

  // --- Patient 3 ---
  const patient3User = await prisma.users.create({
    data: {
      name: 'Pedro Quispe',
      email: 'pedro@gmail.com',
      password: hashedPassword,
      roleId: roleIds['PATIENT'],
      isActive: true,
      validateEmail: true,
    },
  });

  const patient3Profile = await prisma.profiles.create({
    data: {
      name: 'Pedro',
      lastName: 'Quispe',
      userId: patient3User.id,
      phone: '+51955667788',
      gender: 'M',
      birthday: new Date('1978-11-05'),
      typeDocument: 'DNI',
      numberDocument: '30456789',
      address: 'Calle Pizarro 123, Arequipa',
      country: 'Perú',
      state: 'Arequipa',
    },
  });

  const patient3 = await prisma.patients.create({
    data: {
      profileId: patient3Profile.id,
      emergencyContact: '+51999555666',
      bloodType: 'B+',
      allergies: 'Ibuprofeno',
      chronicConditions: 'Diabetes tipo 2',
    },
  });

  // ════════════════════════════════════════════════════
  // 5. AVAILABILITY (horarios regulares)
  // ════════════════════════════════════════════════════
  console.log('📅 Creando disponibilidades...');

  const weekDays: DayOfWeek[] = [
    DayOfWeek.MONDAY,
    DayOfWeek.TUESDAY,
    DayOfWeek.WEDNESDAY,
    DayOfWeek.THURSDAY,
    DayOfWeek.FRIDAY,
  ];

  // Doctor1: Cardiología L-V 9:00-13:00, Eco M-J 15:00-18:00
  for (const day of weekDays) {
    await prisma.availability.create({
      data: {
        doctorId: doctor1.id,
        specialtyId: specCardioGeneral.id,
        dayOfWeek: day,
        timeFrom: timeOnly(9, 0),
        timeTo: timeOnly(13, 0),
        type: AvailabilityType.REGULAR,
        clinicId: clinicLima.id,
      },
    });
  }

  for (const day of [DayOfWeek.TUESDAY, DayOfWeek.THURSDAY]) {
    await prisma.availability.create({
      data: {
        doctorId: doctor1.id,
        specialtyId: specEcocardiografia.id,
        dayOfWeek: day,
        timeFrom: timeOnly(15, 0),
        timeTo: timeOnly(18, 0),
        type: AvailabilityType.REGULAR,
        clinicId: clinicLima.id,
      },
    });
  }

  // Doctor2: Derma L-M-V 8:00-12:00, Consulta General J 8:00-14:00
  for (const day of [DayOfWeek.MONDAY, DayOfWeek.WEDNESDAY, DayOfWeek.FRIDAY]) {
    await prisma.availability.create({
      data: {
        doctorId: doctor2.id,
        specialtyId: specDermaClinica.id,
        dayOfWeek: day,
        timeFrom: timeOnly(8, 0),
        timeTo: timeOnly(12, 0),
        type: AvailabilityType.REGULAR,
        clinicId: clinicLima.id,
      },
    });
  }

  await prisma.availability.create({
    data: {
      doctorId: doctor2.id,
      specialtyId: specConsultaGeneral.id,
      dayOfWeek: DayOfWeek.THURSDAY,
      timeFrom: timeOnly(8, 0),
      timeTo: timeOnly(14, 0),
      type: AvailabilityType.REGULAR,
      clinicId: clinicLima.id,
    },
  });

  // Doctor3 (Arequipa): Consulta General L-V 8:00-16:00
  for (const day of weekDays) {
    await prisma.availability.create({
      data: {
        doctorId: doctor3.id,
        specialtyId: specConsultaAQP.id,
        dayOfWeek: day,
        timeFrom: timeOnly(8, 0),
        timeTo: timeOnly(16, 0),
        type: AvailabilityType.REGULAR,
        clinicId: clinicArequipa.id,
      },
    });
  }

  // ════════════════════════════════════════════════════
  // 6. SCHEDULE BLOCKS
  // ════════════════════════════════════════════════════
  console.log('🚫 Creando bloqueos de agenda...');

  await prisma.scheduleBlocks.create({
    data: {
      doctorId: doctor1.id,
      type: ScheduleBlockType.FULL_DAY,
      startDate: daysFromNow(14),
      endDate: daysFromNow(16),
      reason: 'Congreso de Cardiología en Bogotá',
    },
  });

  await prisma.scheduleBlocks.create({
    data: {
      doctorId: doctor2.id,
      type: ScheduleBlockType.TIME_RANGE,
      startDate: daysFromNow(7),
      endDate: daysFromNow(7),
      timeFrom: timeOnly(8, 0),
      timeTo: timeOnly(10, 0),
      reason: 'Reunión administrativa',
    },
  });

  // ════════════════════════════════════════════════════
  // 7. SCHEDULES
  // ════════════════════════════════════════════════════
  console.log('🗓️ Creando horarios (schedules)...');

  const todayDate = today();
  const tomorrow = daysFromNow(1);
  const dayAfter = daysFromNow(2);

  // Doctor1 — Cardiología hoy
  const schedule1 = await prisma.schedules.create({
    data: {
      doctorId: doctor1.id,
      specialtyId: specCardioGeneral.id,
      scheduleDate: todayDate,
      timeFrom: dateAtHour(todayDate, 9, 0),
      timeTo: dateAtHour(todayDate, 13, 0),
      clinicId: clinicLima.id,
    },
  });

  // Doctor1 — Cardiología mañana
  const schedule1Tomorrow = await prisma.schedules.create({
    data: {
      doctorId: doctor1.id,
      specialtyId: specCardioGeneral.id,
      scheduleDate: tomorrow,
      timeFrom: dateAtHour(tomorrow, 9, 0),
      timeTo: dateAtHour(tomorrow, 13, 0),
      clinicId: clinicLima.id,
    },
  });

  // Doctor2 — Dermatología hoy
  const schedule2 = await prisma.schedules.create({
    data: {
      doctorId: doctor2.id,
      specialtyId: specDermaClinica.id,
      scheduleDate: todayDate,
      timeFrom: dateAtHour(todayDate, 8, 0),
      timeTo: dateAtHour(todayDate, 12, 0),
      clinicId: clinicLima.id,
    },
  });

  // Doctor2 — Consulta General pasado mañana
  const schedule2DayAfter = await prisma.schedules.create({
    data: {
      doctorId: doctor2.id,
      specialtyId: specConsultaGeneral.id,
      scheduleDate: dayAfter,
      timeFrom: dateAtHour(dayAfter, 8, 0),
      timeTo: dateAtHour(dayAfter, 14, 0),
      clinicId: clinicLima.id,
    },
  });

  // Doctor3 — Consulta General mañana (Arequipa)
  const schedule3 = await prisma.schedules.create({
    data: {
      doctorId: doctor3.id,
      specialtyId: specConsultaAQP.id,
      scheduleDate: tomorrow,
      timeFrom: dateAtHour(tomorrow, 8, 0),
      timeTo: dateAtHour(tomorrow, 16, 0),
      clinicId: clinicArequipa.id,
    },
  });

  // ════════════════════════════════════════════════════
  // 8. APPOINTMENTS
  // ════════════════════════════════════════════════════
  console.log('📋 Creando citas...');

  // Appt 1: Juan con Dr. Ramírez — COMPLETED (hoy, pasada)
  const appt1 = await prisma.appointments.create({
    data: {
      patientId: patient1.id,
      scheduleId: schedule1.id,
      startTime: dateAtHour(todayDate, 9, 0),
      endTime: dateAtHour(todayDate, 9, 30),
      reason: 'Control de hipertensión arterial',
      notes: 'Paciente refiere mareos leves por las mañanas.',
      status: AppointmentStatus.COMPLETED,
      paymentStatus: PaymentStatus.PAID,
      amount: specCardioGeneral.price,
      clinicId: clinicLima.id,
    },
  });

  // Appt 2: María con Dra. Flores (derma) — CONFIRMED (hoy, próxima)
  const appt2 = await prisma.appointments.create({
    data: {
      patientId: patient2.id,
      scheduleId: schedule2.id,
      startTime: dateAtHour(todayDate, 10, 0),
      endTime: dateAtHour(todayDate, 10, 20),
      reason: 'Revisión de lunar sospechoso en espalda',
      status: AppointmentStatus.CONFIRMED,
      paymentStatus: PaymentStatus.PENDING,
      amount: specDermaClinica.price,
      clinicId: clinicLima.id,
    },
  });

  // Appt 3: Juan con Dr. Ramírez — CONFIRMED (mañana, recordatorio pendiente)
  const appt3 = await prisma.appointments.create({
    data: {
      patientId: patient1.id,
      scheduleId: schedule1Tomorrow.id,
      startTime: dateAtHour(tomorrow, 9, 0),
      endTime: dateAtHour(tomorrow, 9, 30),
      reason: 'Seguimiento post-tratamiento',
      status: AppointmentStatus.CONFIRMED,
      paymentStatus: PaymentStatus.PENDING,
      amount: specCardioGeneral.price,
      clinicId: clinicLima.id,
      reminderSent: false,
    },
  });

  // Appt 4: María con Dra. Flores (general) — PENDING (pasado mañana)
  const appt4 = await prisma.appointments.create({
    data: {
      patientId: patient2.id,
      scheduleId: schedule2DayAfter.id,
      startTime: dateAtHour(dayAfter, 8, 0),
      endTime: dateAtHour(dayAfter, 8, 20),
      reason: 'Chequeo general anual',
      status: AppointmentStatus.PENDING,
      paymentStatus: PaymentStatus.PENDING,
      amount: specConsultaGeneral.price,
      clinicId: clinicLima.id,
    },
  });

  // Appt 5: Pedro con Dr. Chávez (Arequipa) — CONFIRMED (mañana)
  const appt5 = await prisma.appointments.create({
    data: {
      patientId: patient3.id,
      scheduleId: schedule3.id,
      startTime: dateAtHour(tomorrow, 10, 0),
      endTime: dateAtHour(tomorrow, 10, 20),
      reason: 'Control de diabetes',
      status: AppointmentStatus.CONFIRMED,
      paymentStatus: PaymentStatus.PENDING,
      amount: specConsultaAQP.price,
      clinicId: clinicArequipa.id,
      reminderSent: false,
    },
  });

  // Appt 6: Juan con Dra. Flores — CANCELLED
  const appt6 = await prisma.appointments.create({
    data: {
      patientId: patient1.id,
      scheduleId: schedule2.id,
      startTime: dateAtHour(todayDate, 11, 0),
      endTime: dateAtHour(todayDate, 11, 20),
      reason: 'Consulta dermatológica',
      status: AppointmentStatus.CANCELLED,
      cancelReason: 'Paciente solicitó reprogramación por motivos laborales',
      paymentStatus: PaymentStatus.CANCELLED,
      amount: specDermaClinica.price,
      clinicId: clinicLima.id,
    },
  });

  // ════════════════════════════════════════════════════
  // 9. CLINICAL NOTES (para cita completada)
  // ════════════════════════════════════════════════════
  console.log('📝 Creando notas clínicas...');

  await prisma.clinicalNotes.create({
    data: {
      appointmentId: appt1.id,
      summary: 'Paciente masculino de 40 años con antecedentes de HTA. PA: 130/85 mmHg. Frecuencia cardíaca: 72 lpm. Ritmo sinusal normal en auscultación.',
      plan: 'Continuar con Losartán 50mg/día. Control en 3 meses con EKG. Recomendación de dieta hiposódica y ejercicio aeróbico 30 min/día.',
      diagnosis: 'I10 - Hipertensión esencial (primaria), controlada',
    },
  });

  // ════════════════════════════════════════════════════
  // 10. PRESCRIPTIONS
  // ════════════════════════════════════════════════════
  console.log('💊 Creando recetas...');

  const prescription1 = await prisma.prescriptions.create({
    data: {
      appointmentId: appt1.id,
      instructions: 'Tomar los medicamentos con agua. No suspender el tratamiento sin consulta médica. Evitar el consumo excesivo de sal.',
      validUntil: daysFromNow(90),
      items: {
        create: [
          {
            medication: 'Losartán',
            dosage: '50mg',
            frequency: '1 tableta cada 24 horas',
            duration: 'Uso continuo (3 meses)',
            notes: 'Tomar por las mañanas en ayunas',
          },
          {
            medication: 'Aspirina',
            dosage: '100mg',
            frequency: '1 tableta cada 24 horas',
            duration: 'Uso continuo (3 meses)',
            notes: 'Tomar después del almuerzo',
          },
          {
            medication: 'Atorvastatina',
            dosage: '20mg',
            frequency: '1 tableta cada 24 horas',
            duration: 'Uso continuo (3 meses)',
            notes: 'Tomar por las noches antes de dormir',
          },
        ],
      },
    },
  });

  // ════════════════════════════════════════════════════
  // 11. TRANSACTIONS
  // ════════════════════════════════════════════════════
  console.log('💰 Creando transacciones...');

  await prisma.transactions.create({
    data: {
      appointmentId: appt1.id,
      amount: specCardioGeneral.price || 0,
      currency: 'PEN',
      paymentMethod: PaymentMethod.CASH,
      status: PaymentStatus.PAID,
    },
  });

  // ════════════════════════════════════════════════════
  // 12. REVIEWS
  // ════════════════════════════════════════════════════
  console.log('⭐ Creando reseñas...');

  await prisma.reviews.create({
    data: {
      doctorId: doctor1.id,
      patientId: patient1.id,
      rating: 5,
      comment: 'Excelente doctor, muy atento y profesional. Explicó todo con detalle y paciencia.',
    },
  });

  await prisma.reviews.create({
    data: {
      doctorId: doctor2.id,
      patientId: patient2.id,
      rating: 4,
      comment: 'Muy buena doctora. La consulta fue rápida pero completa.',
    },
  });

  // ════════════════════════════════════════════════════
  // 13. MEDICAL HISTORY
  // ════════════════════════════════════════════════════
  console.log('🏥 Creando historial médico...');

  await prisma.medicalHistory.create({
    data: {
      patientId: patient1.id,
      condition: 'Hipertensión Arterial',
      description: 'Diagnosticada hace 3 años. Tratamiento con Losartán 50mg. Buen control con PA promedio 130/85.',
      diagnosedDate: new Date('2023-03-10'),
      status: MedicalHistoryStatus.CHRONIC,
      notes: 'Antecedentes familiares: padre con HTA y ACV.',
    },
  });

  await prisma.medicalHistory.create({
    data: {
      patientId: patient2.id,
      condition: 'Asma Bronquial Leve',
      description: 'Asma intermitente desde la infancia. Usa salbutamol de rescate ocasionalmente.',
      diagnosedDate: new Date('2005-08-20'),
      status: MedicalHistoryStatus.ACTIVE,
    },
  });

  await prisma.medicalHistory.create({
    data: {
      patientId: patient3.id,
      condition: 'Diabetes Mellitus Tipo 2',
      description: 'Diagnosticada hace 5 años. Tratamiento con Metformina 850mg. HbA1c último control: 7.2%.',
      diagnosedDate: new Date('2021-01-15'),
      status: MedicalHistoryStatus.CHRONIC,
      notes: 'Requiere control semestral de HbA1c y fondo de ojo anual.',
    },
  });

  await prisma.medicalHistory.create({
    data: {
      patientId: patient3.id,
      condition: 'Apendicectomía',
      description: 'Cirugía de apendicitis aguda sin complicaciones.',
      diagnosedDate: new Date('2015-07-03'),
      status: MedicalHistoryStatus.RESOLVED,
    },
  });

  // ════════════════════════════════════════════════════
  // 14. NOTIFICATIONS
  // ════════════════════════════════════════════════════
  console.log('🔔 Creando notificaciones...');

  await prisma.notifications.create({
    data: {
      userId: patient1User.id,
      type: NotificationType.APPOINTMENT_CONFIRMED,
      channel: NotificationChannel.IN_APP,
      title: 'Cita confirmada',
      message: 'Tu cita con el Dr. Roberto Ramírez (Cardiología General) para mañana a las 9:00 AM ha sido confirmada.',
      isRead: false,
    },
  });

  await prisma.notifications.create({
    data: {
      userId: patient2User.id,
      type: NotificationType.APPOINTMENT_CONFIRMED,
      channel: NotificationChannel.IN_APP,
      title: 'Cita confirmada',
      message: 'Tu cita con la Dra. Lucía Flores (Dermatología Clínica) para hoy a las 10:00 AM ha sido confirmada.',
      isRead: true,
    },
  });

  await prisma.notifications.create({
    data: {
      userId: patient1User.id,
      type: NotificationType.PRESCRIPTION_CREATED,
      channel: NotificationChannel.IN_APP,
      title: 'Nueva receta médica',
      message: 'El Dr. Roberto Ramírez ha emitido una receta médica para tu cita de Cardiología General.',
      isRead: false,
    },
  });

  await prisma.notifications.create({
    data: {
      userId: patient1User.id,
      type: NotificationType.APPOINTMENT_CANCELLED,
      channel: NotificationChannel.IN_APP,
      title: 'Cita cancelada',
      message: 'Tu cita con la Dra. Lucía Flores (Dermatología Clínica) ha sido cancelada.',
      isRead: true,
    },
  });

  await prisma.notifications.create({
    data: {
      userId: patient3User.id,
      type: NotificationType.NEW_APPOINTMENT,
      channel: NotificationChannel.IN_APP,
      title: 'Nueva cita agendada',
      message: 'Se ha agendado una cita con el Dr. Fernando Chávez (Consulta General) para mañana a las 10:00 AM en la sede Arequipa.',
      isRead: false,
    },
  });

  // ════════════════════════════════════════════════════
  // 15. HOLIDAYS (Perú 2026)
  // ════════════════════════════════════════════════════
  console.log('🎉 Creando feriados...');

  const year = new Date().getFullYear();

  const holidays = [
    { name: 'Año Nuevo', date: `${year}-01-01`, isRecurring: true },
    { name: 'Jueves Santo', date: `${year}-04-02`, isRecurring: false },
    { name: 'Viernes Santo', date: `${year}-04-03`, isRecurring: false },
    { name: 'Día del Trabajo', date: `${year}-05-01`, isRecurring: true },
    { name: 'San Pedro y San Pablo', date: `${year}-06-29`, isRecurring: true },
    { name: 'Fiestas Patrias', date: `${year}-07-28`, isRecurring: true },
    { name: 'Fiestas Patrias (2do día)', date: `${year}-07-29`, isRecurring: true },
    { name: 'Santa Rosa de Lima', date: `${year}-08-30`, isRecurring: true },
    { name: 'Combate de Angamos', date: `${year}-10-08`, isRecurring: true },
    { name: 'Todos los Santos', date: `${year}-11-01`, isRecurring: true },
    { name: 'Inmaculada Concepción', date: `${year}-12-08`, isRecurring: true },
    { name: 'Navidad', date: `${year}-12-25`, isRecurring: true },
  ];

  for (const h of holidays) {
    // Feriados nacionales: clinicId null = visibles para todas las clínicas
    await prisma.holidays.create({
      data: {
        name: h.name,
        date: new Date(`${h.date}T00:00:00Z`),
        year,
        isRecurring: h.isRecurring,
        clinicId: null,
      },
    });
  }

  // ════════════════════════════════════════════════════
  // SUMMARY
  // ════════════════════════════════════════════════════
  console.log('\n✅ Seed completado exitosamente!\n');
  console.log('📊 Resumen:');
  console.log('   • 2 clínicas (Lima, Arequipa)');
  console.log('   • 5 categorías');
  console.log('   • 6 especialidades');
  console.log(`   • 9 usuarios (1 super-admin, 1 admin clínica, 1 recepcionista, 3 doctores, 3 pacientes, contraseña: ${PASSWORD})`);
  console.log('   • 3 doctores con disponibilidad L-V');
  console.log('   • 5 schedules (hoy, mañana, pasado)');
  console.log('   • 6 citas (1 completada, 2 confirmadas, 1 pendiente, 1 cancelada, 1 arequipa)');
  console.log('   • 1 receta con 3 medicamentos');
  console.log('   • 4 historiales médicos');
  console.log('   • 5 notificaciones');
  console.log('   • 12 feriados Perú ' + year + ' (globales, visibles para todas las clínicas)');
  if (process.env.NODE_ENV !== 'production') {
    console.log('\n🔑 Credenciales de prueba:');
    console.log(`   admin@mediclick.com / ${PASSWORD} (Super Admin)`);
    console.log(`   adminlima@mediclick.com / ${PASSWORD} (Admin Lima)`);
    console.log(`   recepcion@mediclick.com / ${PASSWORD} (Recepcionista)`);
    console.log(`   ramirez@mediclick.com / ${PASSWORD} (Doctor - Cardiólogo)`);
    console.log(`   flores@mediclick.com / ${PASSWORD} (Doctora - Dermatóloga)`);
    console.log(`   chavez@mediclick.com / ${PASSWORD} (Doctor - Arequipa)`);
    console.log(`   juan@gmail.com / ${PASSWORD} (Paciente)`);
    console.log(`   maria@gmail.com / ${PASSWORD} (Paciente)`);
    console.log(`   pedro@gmail.com / ${PASSWORD} (Paciente)`);
  }
}

main()
  .catch((e) => {
    console.error('❌ Error durante el seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
