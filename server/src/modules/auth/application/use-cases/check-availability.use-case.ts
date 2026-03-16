import { Injectable, Inject } from '@nestjs/common';
import type { IPatientRepository } from '../../../patients/domain/repositories/patient.repository.js';

@Injectable()
export class CheckAvailabilityUseCase {
  constructor(
    @Inject('IPatientRepository')
    private readonly patientRepository: IPatientRepository,
  ) {}

  async checkEmail(email: string): Promise<{ available: boolean }> {
    const exists = await this.patientRepository.existsByEmail(email);
    return { available: !exists };
  }

  async checkDocument(
    typeDocument: string,
    numberDocument: string,
  ): Promise<{ available: boolean }> {
    const exists = await this.patientRepository.existsByDni(
      typeDocument,
      numberDocument,
    );
    return { available: !exists };
  }
}
