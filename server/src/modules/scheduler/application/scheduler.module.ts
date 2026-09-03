import { Module } from '@nestjs/common';
import { NotificationsModule } from '../../notifications/application/notifications.module.js';
import { AppointmentsModule } from '../../appointments/application/appointments.module.js';
import { AppointmentReminderService } from '../domain/services/appointment-reminder.service.js';
import { PrismaAppointmentReminderDeliveryRepository } from '../infrastructure/persistence/prisma-appointment-reminder-delivery.repository.js';

@Module({
  imports: [NotificationsModule, AppointmentsModule],
  providers: [
    AppointmentReminderService,
    {
      provide: 'IAppointmentReminderDeliveryRepository',
      useClass: PrismaAppointmentReminderDeliveryRepository,
    },
    PrismaAppointmentReminderDeliveryRepository,
  ],
  exports: [
    'IAppointmentReminderDeliveryRepository',
    PrismaAppointmentReminderDeliveryRepository,
  ],
})
export class SchedulerModule {}
