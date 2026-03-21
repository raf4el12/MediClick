import { Module } from '@nestjs/common';
import { NotificationsModule } from '../../notifications/application/notifications.module.js';
import { AppointmentReminderService } from '../domain/services/appointment-reminder.service.js';

@Module({
  imports: [NotificationsModule],
  providers: [AppointmentReminderService],
})
export class SchedulerModule {}
