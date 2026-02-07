import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module.js';
import { AuthModule } from './modules/auth/application/auth.module.js';
import { UsersModule } from './modules/users/application/users.module.js';
import { CategoriesModule } from './modules/categories/application/categories.module.js';
import { SpecialtiesModule } from './modules/specialties/application/specialties.module.js';
import { DoctorsModule } from './modules/doctors/application/doctors.module.js';
import { AvailabilityModule } from './modules/availability/application/availability.module.js';
import { SchedulesModule } from './modules/schedules/application/schedules.module.js';
import { PatientsModule } from './modules/patients/application/patients.module.js';
import { AppointmentsModule } from './modules/appointments/application/appointments.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    CategoriesModule,
    SpecialtiesModule,
    DoctorsModule,
    AvailabilityModule,
    SchedulesModule,
    PatientsModule,
    AppointmentsModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
