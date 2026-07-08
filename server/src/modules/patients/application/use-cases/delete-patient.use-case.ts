import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { IPatientRepository } from '../../domain/repositories/patient.repository.js';
import {
  PATIENT_DELETED_EVENT,
  type PatientChangedEvent,
} from '../../../../shared/events/patient-events.interface.js';

@Injectable()
export class DeletePatientUseCase {
  constructor(
    @Inject('IPatientRepository')
    private readonly patientRepository: IPatientRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(id: number): Promise<void> {
    const existing = await this.patientRepository.findById(id);
    if (!existing) {
      throw new NotFoundException('Paciente no encontrado');
    }

    await this.patientRepository.softDelete(id);

    const event: PatientChangedEvent = { patientId: id };
    this.eventEmitter.emit(PATIENT_DELETED_EVENT, event);
  }
}
