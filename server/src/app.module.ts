import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { join } from 'path';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import { TenantInterceptor } from './shared/interceptors/tenant.interceptor.js';
import { RedisService } from './shared/redis/redis.service.js';
import { GqlThrottlerGuard } from './shared/guards/gql-throttler.guard.js';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { RequestLoggerMiddleware } from './shared/middleware/request-logger.middleware.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { RedisModule } from './shared/redis/redis.module.js';
import { PdfModule } from './shared/pdf/pdf.module.js';
import { MailModule } from './shared/mail/mail.module.js';
import { SecurityAuditModule } from './shared/security-audit/security-audit.module.js';
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
import { WaitlistModule } from './modules/waitlist/application/waitlist.module.js';
import { RolesModule } from './modules/roles/application/roles.module.js';
import { PermissionsModule } from './modules/permissions/application/permissions.module.js';
import { PatientRecordsGraphqlModule } from './modules/patient-records-graphql/application/patient-records-graphql.module.js';
import { ReviewsModule } from './modules/reviews/application/reviews.module.js';
import { InteroperabilityModule } from './modules/interoperability/application/interoperability.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    // Límites por usuario (ver GqlThrottlerGuard.getTracker). Toda la app
    // pasa por un único POST /graphql y React Query dispara ráfagas de
    // queries al montar una vista, por eso 'short' tolera el burst inicial.
    // Las rutas REST sensibles (login, registro, recuperación) endurecen
    // estos valores con @Throttle por-ruta.
    //
    // Storage en Redis (reutiliza el cliente de RedisService) para que los
    // contadores se compartan entre instancias al escalar; en memoria cada
    // réplica tendría su propio bucket y el límite efectivo se multiplicaría.
    ThrottlerModule.forRootAsync({
      inject: [RedisService],
      useFactory: (redisService: RedisService) => ({
        throttlers: [
          { name: 'short', ttl: 1000, limit: 20 },
          { name: 'medium', ttl: 10000, limit: 100 },
          { name: 'long', ttl: 60000, limit: 300 },
        ],
        storage: new ThrottlerStorageRedisService(redisService.getClient()),
      }),
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
    SecurityAuditModule,
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
    WaitlistModule,
    RolesModule,
    PermissionsModule,
    PatientRecordsGraphqlModule,
    ReviewsModule,
    InteroperabilityModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_GUARD,
      useClass: GqlThrottlerGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TenantInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestLoggerMiddleware).exclude('health').forRoutes('*');
  }
}
