import { Module } from '@nestjs/common';
import { PatientsModule } from '../../patients/application/patients.module.js';
import { SchedulesModule } from '../../schedules/application/schedules.module.js';
import { DoctorsModule } from '../../doctors/application/doctors.module.js';
import { PrismaAppointmentRepository } from '../infrastructure/persistence/prisma-appointment.repository.js';
import { CreateAppointmentUseCase } from './use-cases/create-appointment.use-case.js';
import { GetDashboardAppointmentsUseCase } from './use-cases/get-dashboard-appointments.use-case.js';
import { GetDoctorDailyAppointmentsUseCase } from './use-cases/get-doctor-daily-appointments.use-case.js';
import { CheckInAppointmentUseCase } from './use-cases/check-in-appointment.use-case.js';
import { CancelAppointmentUseCase } from './use-cases/cancel-appointment.use-case.js';
import { RescheduleAppointmentUseCase } from './use-cases/reschedule-appointment.use-case.js';
import { CompleteAppointmentUseCase } from './use-cases/complete-appointment.use-case.js';
import { AppointmentController } from '../interfaces/controllers/appointment.controller.js';

@Module({
  imports: [PatientsModule, SchedulesModule, DoctorsModule],
  controllers: [AppointmentController],
  providers: [
    {
      provide: 'IAppointmentRepository',
      useClass: PrismaAppointmentRepository,
    },
    CreateAppointmentUseCase,
    GetDashboardAppointmentsUseCase,
    GetDoctorDailyAppointmentsUseCase,
    CheckInAppointmentUseCase,
    CancelAppointmentUseCase,
    RescheduleAppointmentUseCase,
    CompleteAppointmentUseCase,
  ],
  exports: ['IAppointmentRepository'],
})
export class AppointmentsModule {}
