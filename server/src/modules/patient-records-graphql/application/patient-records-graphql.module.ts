import { Module } from '@nestjs/common';
import { PatientRecordsResolver } from '../interfaces/resolvers/patient-records.resolver.js';
import { GetPatientRecordUseCase } from './use-cases/get-patient-record.use-case.js';
import { PrismaPatientRecordQuery } from '../infrastructure/persistence/prisma-patient-record.query.js';

@Module({
  providers: [
    PatientRecordsResolver,
    GetPatientRecordUseCase,
    {
      provide: 'IPatientRecordQueryPort',
      useClass: PrismaPatientRecordQuery,
    },
  ],
})
export class PatientRecordsGraphqlModule {}
