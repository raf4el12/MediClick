import { Module } from '@nestjs/common';
import { NotificationsModule } from '../../notifications/application/notifications.module.js';
import { AppointmentsModule } from '../../appointments/application/appointments.module.js';
import { AppointmentReminderService } from '../domain/services/appointment-reminder.service.js';

@Module({
  imports: [NotificationsModule, AppointmentsModule],
  providers: [AppointmentReminderService],
})
export class SchedulerModule {}
