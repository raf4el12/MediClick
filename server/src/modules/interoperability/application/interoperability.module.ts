import { Module } from '@nestjs/common';
import { PrismaFhirResourceRepository } from '../infrastructure/persistence/prisma-fhir-resource.repository.js';
import { FhirResourceService } from './services/fhir-resource.service.js';
import { PatientProjectionListener } from './listeners/patient-projection.listener.js';
import { EncounterProjectionListener } from './listeners/encounter-projection.listener.js';

@Module({
  providers: [
    {
      provide: 'IFhirResourceRepository',
      useClass: PrismaFhirResourceRepository,
    },
    FhirResourceService,
    PatientProjectionListener,
    EncounterProjectionListener,
  ],
  exports: [FhirResourceService],
})
export class InteroperabilityModule {}
