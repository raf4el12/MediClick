import { Module } from '@nestjs/common';
import { PatientsModule } from '../../patients/application/patients.module.js';
import { SpecialtiesModule } from '../../specialties/application/specialties.module.js';
import { DoctorsModule } from '../../doctors/application/doctors.module.js';
import { SchedulesModule } from '../../schedules/application/schedules.module.js';
import { AppointmentsModule } from '../../appointments/application/appointments.module.js';
import { NotificationsModule } from '../../notifications/application/notifications.module.js';
import { RedisModule } from '../../../shared/redis/redis.module.js';
import { PrismaWaitlistEntryRepository } from '../infrastructure/persistence/prisma-waitlist-entry.repository.js';
import { PrismaWaitlistOfferRepository } from '../infrastructure/persistence/prisma-waitlist-offer.repository.js';
import { WaitlistLockService } from './services/waitlist-lock.service.js';
import { FindNextMatchUseCase } from './use-cases/find-next-match.use-case.js';
import { AcceptOfferUseCase } from './use-cases/accept-offer.use-case.js';
import { RejectOfferUseCase } from './use-cases/reject-offer.use-case.js';
import { JoinWaitlistUseCase } from './use-cases/join-waitlist.use-case.js';
import { LeaveWaitlistUseCase } from './use-cases/leave-waitlist.use-case.js';
import { GetMyWaitlistUseCase } from './use-cases/get-my-waitlist.use-case.js';
import { GetClinicWaitlistUseCase } from './use-cases/get-clinic-waitlist.use-case.js';
import { AddWaitlistPriorityUseCase } from './use-cases/add-waitlist-priority.use-case.js';
import { AppointmentCancelledListener } from './listeners/appointment-cancelled.listener.js';
import { WaitlistNotificationListener } from './listeners/waitlist-notification.listener.js';
import { ExpireStaleOffersUseCase } from './jobs/expire-stale-offers.use-case.js';
import { ExpireStaleEntriesUseCase } from './jobs/expire-stale-entries.use-case.js';
import { WaitlistController } from '../interfaces/controllers/waitlist.controller.js';

@Module({
  imports: [
    PatientsModule,
    SpecialtiesModule,
    DoctorsModule,
    SchedulesModule,
    AppointmentsModule,
    NotificationsModule,
    RedisModule,
  ],
  controllers: [WaitlistController],
  providers: [
    {
      provide: 'IWaitlistEntryRepository',
      useClass: PrismaWaitlistEntryRepository,
    },
    {
      provide: 'IWaitlistOfferRepository',
      useClass: PrismaWaitlistOfferRepository,
    },
    WaitlistLockService,
    FindNextMatchUseCase,
    AcceptOfferUseCase,
    RejectOfferUseCase,
    JoinWaitlistUseCase,
    LeaveWaitlistUseCase,
    GetMyWaitlistUseCase,
    GetClinicWaitlistUseCase,
    AddWaitlistPriorityUseCase,
    AppointmentCancelledListener,
    WaitlistNotificationListener,
    ExpireStaleOffersUseCase,
    ExpireStaleEntriesUseCase,
  ],
})
export class WaitlistModule {}
