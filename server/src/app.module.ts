import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { join } from 'path';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { GqlThrottlerGuard } from './shared/guards/gql-throttler.guard.js';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { RequestLoggerMiddleware } from './shared/middleware/request-logger.middleware.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { RedisModule } from './shared/redis/redis.module.js';
import { PdfModule } from './shared/pdf/pdf.module.js';
import { MailModule } from './shared/mail/mail.module.js';
import { HealthModule } from './shared/health/health.module.js';
import { AuthModule } from './modules/auth/application/auth.module.js';
import { UsersModule } from './modules/users/application/users.module.js';
import { CategoriesModule } from './modules/categories/application/categories.module.js';
import { SpecialtiesModule } from './modules/specialties/application/specialties.module.js';
import { ClinicsModule } from './modules/clinics/application/clinics.module.js';
import { DoctorsModule } from './modules/doctors/application/doctors.module.js';
import { AvailabilityModule } from './modules/availability/application/availability.module.js';
import { SchedulesModule } from './modules/schedules/application/schedules.module.js';
import { PatientsModule } from './modules/patients/application/patients.module.js';
import { AppointmentsModule } from './modules/appointments/application/appointments.module.js';
import { ClinicalNotesModule } from './modules/clinical-notes/application/clinical-notes.module.js';
import { PrescriptionsModule } from './modules/prescriptions/application/prescriptions.module.js';
import { ReportsModule } from './modules/reports/application/reports.module.js';
import { NotificationsModule } from './modules/notifications/application/notifications.module.js';
import { PaymentsModule } from './modules/payments/application/payments.module.js';
import { MedicalHistoryModule } from './modules/medical-history/application/medical-history.module.js';
import { HolidaysModule } from './modules/holidays/application/holidays.module.js';
import { ScheduleBlocksModule } from './modules/schedule-blocks/application/schedule-blocks.module.js';
import { SchedulerModule } from './modules/scheduler/application/scheduler.module.js';
import { RolesModule } from './modules/roles/application/roles.module.js';
import { PermissionsModule } from './modules/permissions/application/permissions.module.js';
import { PatientRecordsGraphqlModule } from './modules/patient-records-graphql/application/patient-records-graphql.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot({
      throttlers: [
        { name: 'short', ttl: 1000, limit: 3 },
        { name: 'medium', ttl: 10000, limit: 20 },
        { name: 'long', ttl: 60000, limit: 100 },
      ],
    }),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
      sortSchema: true,
      playground: process.env.NODE_ENV !== 'production',
      context: ({ req, res }: { req: unknown; res: unknown }) => ({ req, res }),
    }),
    PrismaModule,
    RedisModule,
    PdfModule,
    MailModule,
    HealthModule,
    AuthModule,
    UsersModule,
    CategoriesModule,
    SpecialtiesModule,
    ClinicsModule,
    DoctorsModule,
    AvailabilityModule,
    SchedulesModule,
    PatientsModule,
    AppointmentsModule,
    ClinicalNotesModule,
    PrescriptionsModule,
    ReportsModule,
    NotificationsModule,
    PaymentsModule,
    MedicalHistoryModule,
    HolidaysModule,
    ScheduleBlocksModule,
    SchedulerModule,
    RolesModule,
    PermissionsModule,
    PatientRecordsGraphqlModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_GUARD,
      useClass: GqlThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestLoggerMiddleware).exclude('health').forRoutes('*');
  }
}
