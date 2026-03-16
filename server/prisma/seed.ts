import { PrismaClient, UserRole, AppointmentStatus, PaymentStatus, PaymentMethod, DayOfWeek, AvailabilityType, ScheduleBlockType, NotificationType, NotificationChannel, MedicalHistoryStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import 'dotenv/config';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Starting database seed...');

  // 1. Categories
  const catCardio = await prisma.categories.upsert({
    where: { id: 1 },
    update: {},
    create: {
      name: 'Cardiyología',
      description: 'Especialidades relacionadas con el corazón',
      icon: 'Heart',
      color: '#ff4d4f',
      order: 1,
    },
  });

  const catDerma = await prisma.categories.upsert({
    where: { id: 2 },
    update: {},
    create: {
      name: 'Dermatología',
      description: 'Especialidades de la piel',
      icon: 'Sparkles',
      color: '#40a9ff',
      order: 2,
    },
  });

  // 2. Specialties
  const specCardioGeneral = await prisma.specialties.upsert({
    where: { id: 1 },
    update: {},
    create: {
      categoryId: catCardio.id,
      name: 'Cardiología General',
      description: 'Consulta general de cardiología',
      duration: 30,
      bufferMinutes: 10,
      price: 150.0,
      icon: 'HeartPulse',
    },
  });

  const specDermaGeneral = await prisma.specialties.upsert({
    where: { id: 2 },
    update: {},
    create: {
      categoryId: catDerma.id,
      name: 'Dermatología Clínica',
      description: 'Tratamiento de enfermedades de la piel',
      duration: 20,
      bufferMinutes: 5,
      price: 120.0,
      icon: 'Sun',
    },
  });

  // 3. User - ADMIN
  const hashedPassword = await bcrypt.hash('123456', 10);
  const adminUser = await prisma.users.upsert({
    where: { email: 'admin@mediclick.com' },
    update: {},
    create: {
      name: 'Admin',
      email: 'admin@mediclick.com',
      password: hashedPassword,
      role: UserRole.ADMIN,
      isActive: true,
      validateEmail: true,
    },
  });

  // 4. User -> Profile -> Doctor
  const doctorUser = await prisma.users.upsert({
    where: { email: 'doctor@mediclick.com' },
    update: {},
    create: {
      name: 'Dr. House',
      email: 'doctor@mediclick.com',
      password: hashedPassword,
      photo: 'https://i.pravatar.cc/150?u=doctor',
      role: UserRole.DOCTOR,
      isActive: true,
      validateEmail: true,
    },
  });

  const doctorProfile = await prisma.profiles.upsert({
    where: { email: 'doctor@mediclick.com' },
    update: {},
    create: {
      name: 'Gregory',
      lastName: 'House',
      email: 'doctor@mediclick.com',
      userId: doctorUser.id,
      phone: '+123456789',
      address: '221B Baker St',
    },
  });

  let doctor = await prisma.doctors.findUnique({
    where: { profileId: doctorProfile.id },
  });

  if (!doctor) {
    doctor = await prisma.doctors.create({
      data: {
        profileId: doctorProfile.id,
        licenseNumber: 'DOC-123456',
        resume: 'Especialista brillante pero cínico.',
        maxOverbookPerDay: 2,
        specialties: {
          create: [{ specialtyId: specCardioGeneral.id }],
        },
      },
    });
  }

  // 5. User -> Profile -> Patient
  const patientUser = await prisma.users.upsert({
    where: { email: 'patient@mediclick.com' },
    update: {},
    create: {
      name: 'John Doe',
      email: 'patient@mediclick.com',
      password: hashedPassword,
      photo: 'https://i.pravatar.cc/150?u=patient',
      role: UserRole.PATIENT,
      isActive: true,
      validateEmail: true,
    },
  });

  const patientProfile = await prisma.profiles.upsert({
    where: { email: 'patient@mediclick.com' },
    update: {},
    create: {
      name: 'John',
      lastName: 'Doe',
      email: 'patient@mediclick.com',
      userId: patientUser.id,
      phone: '+987654321',
      address: '123 Main St',
    },
  });

  let patient = await prisma.patients.findUnique({
    where: { profileId: patientProfile.id },
  });

  if (!patient) {
    patient = await prisma.patients.create({
      data: {
        profileId: patientProfile.id,
        emergencyContact: 'Jane Doe (+1122334455)',
        bloodType: 'O+',
        allergies: 'Penicillin',
        chronic_conditions: 'Asthma',
      },
    });
  }

  // 6. Availability and ScheduleBlocks
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const existAvailability = await prisma.availability.findFirst({
    where: { doctorId: doctor.id },
  });
  if (!existAvailability) {
    await prisma.availability.create({
      data: {
        doctorId: doctor.id,
        specialtyId: specCardioGeneral.id,
        dayOfWeek: DayOfWeek.MONDAY,
        timeFrom: new Date(new Date().setHours(9, 0, 0, 0)),
        timeTo: new Date(new Date().setHours(17, 0, 0, 0)),
        type: AvailabilityType.REGULAR,
      },
    });
  }

  const existBlock = await prisma.scheduleBlocks.findFirst({
    where: { doctorId: doctor.id },
  });
  if (!existBlock) {
    await prisma.scheduleBlocks.create({
      data: {
        doctorId: doctor.id,
        type: ScheduleBlockType.FULL_DAY,
        startDate: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000), // Next week
        endDate: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000),
        reason: 'Vacaciones',
      },
    });
  }

  // 7. Schedule & Appointments
  let schedule = await prisma.schedules.findFirst({
    where: { doctorId: doctor.id },
  });

  if (!schedule) {
    schedule = await prisma.schedules.create({
      data: {
        doctorId: doctor.id,
        specialtyId: specCardioGeneral.id,
        scheduleDate: today,
        timeFrom: new Date(new Date().setHours(9, 0, 0, 0)),
        timeTo: new Date(new Date().setHours(17, 0, 0, 0)),
      },
    });
  }

  const existAppt = await prisma.appointments.findFirst({
    where: { patientId: patient.id, scheduleId: schedule.id },
  });

  let appointment = existAppt;

  if (!existAppt) {
    appointment = await prisma.appointments.create({
      data: {
        patientId: patient.id,
        scheduleId: schedule.id,
        startTime: new Date(new Date().setHours(10, 0, 0, 0)),
        endTime: new Date(new Date().setHours(10, 30, 0, 0)),
        reason: 'Chequeo de rutina del corazón',
        notes: 'Paciente refiere leve taquicardia ocasional.',
        status: AppointmentStatus.COMPLETED,
        paymentStatus: PaymentStatus.PAID,
        amount: specCardioGeneral.price,
      },
    });

    // 8. Clinical Notes
    await prisma.clinicalNotes.create({
      data: {
        appointmentId: appointment.id,
        summary: 'Paciente estable. Ritmo sinusal normal.',
        plan: 'Realizar EKG en 6 meses.',
        diagnosis: 'I10 - Hipertensión esencial (primaria)',
      },
    });

    // 9. Prescriptions & Items
    await prisma.prescriptions.create({
      data: {
        appointmentId: appointment.id,
        instructions: 'Tomar con mucha agua.',
        validUntil: new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000), // 30 days
        items: {
          create: [
            {
              medication: 'Aspirina',
              dosage: '100mg',
              frequency: '1 cada 24 horas',
              duration: 'Por 30 días',
              notes: 'Despues del almuerzo',
            },
          ],
        },
      },
    });

    // 10. Transactions
    await prisma.transactions.create({
      data: {
        appointmentId: appointment.id,
        amount: specCardioGeneral.price || 0,
        currency: 'USD',
        paymentMethod: PaymentMethod.CREDIT_CARD,
        status: PaymentStatus.PAID,
        gatewayId: 'pi_3J8...',
      },
    });

    // 11. Reviews
    await prisma.reviews.create({
      data: {
        doctorId: doctor.id,
        patientId: patient.id,
        rating: 5,
        comment: 'Excelente doctor, muy atento y profesional.',
      },
    });
  }

  // 12. Medical History
  const existHistory = await prisma.medicalHistory.findFirst({
    where: { patientId: patient.id },
  });
  if (!existHistory) {
    await prisma.medicalHistory.create({
      data: {
        patientId: patient.id,
        condition: 'Hipertensión Arterial',
        description: 'Diagnosticado hace 2 años.',
        diagnosedDate: new Date('2022-01-15T00:00:00Z'),
        status: MedicalHistoryStatus.CHRONIC,
      },
    });
  }

  // 13. Notifications
  const existNotif = await prisma.notifications.findFirst({
    where: { userId: patientUser.id },
  });
  if (!existNotif) {
    await prisma.notifications.create({
      data: {
        userId: patientUser.id,
        type: NotificationType.APPOINTMENT_CONFIRMED,
        channel: NotificationChannel.IN_APP,
        title: 'Cita confirmada',
        message: 'Tu cita con el Dr. House ha sido confirmada.',
        isRead: false,
      },
    });
  }

  // 14. Holidays
  const currentYear = today.getFullYear();
  const existHoliday = await prisma.holidays.findFirst({
    where: { year: currentYear },
  });
  if (!existHoliday) {
    await prisma.holidays.create({
      data: {
        name: 'Navidad',
        date: new Date(`${currentYear}-12-25T00:00:00Z`),
        year: currentYear,
        isRecurring: true,
      },
    });
  }

  console.log('✅ Database seed completed successfully.');
}

main()
  .catch((e) => {
    console.error('❌ Error during database seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
