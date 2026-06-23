import { Module } from '@nestjs/common';
import { PrismaFhirResourceRepository } from '../infrastructure/persistence/prisma-fhir-resource.repository.js';
import { FhirResourceService } from './services/fhir-resource.service.js';

@Module({
  providers: [
    {
      provide: 'IFhirResourceRepository',
      useClass: PrismaFhirResourceRepository,
    },
    FhirResourceService,
  ],
  exports: [FhirResourceService],
})
export class InteroperabilityModule {}
