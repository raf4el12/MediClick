import { Injectable, Inject, ConflictException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CreatePatientDto } from '../dto/create-patient.dto.js';
import { PatientResponseDto } from '../dto/patient-response.dto.js';
import type { IPatientRepository } from '../../domain/repositories/patient.repository.js';
import type { IPasswordService } from '../../../../shared/domain/contracts/password-service.interface.js';
import {
  PATIENT_CREATED_EVENT,
  type PatientChangedEvent,
} from '../../../../shared/events/patient-events.interface.js';

@Injectable()
export class CreatePatientUseCase {
  constructor(
    @Inject('IPatientRepository')
    private readonly patientRepository: IPatientRepository,
    @Inject('IPasswordService')
    private readonly passwordService: IPasswordService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(dto: CreatePatientDto): Promise<PatientResponseDto> {
    const emailExists = await this.patientRepository.existsByEmail(dto.email);
    if (emailExists) {
      throw new ConflictException('El email ya está registrado');
    }

    if (dto.typeDocument && dto.numberDocument) {
      const dniExists = await this.patientRepository.existsByDni(
        dto.typeDocument,
        dto.numberDocument,
      );
      if (dniExists) {
        throw new ConflictException(
          'El documento de identidad ya está registrado',
        );
      }
    }

    const hashedPassword = await this.passwordService.hash(dto.email);

    const patient = await this.patientRepository.create({
      user: {
        name: dto.name,
        email: dto.email,
        password: hashedPassword,
      },
      profile: {
        name: dto.name,
        lastName: dto.lastName,
        phone: dto.phone,
        birthday: dto.birthday ? new Date(dto.birthday) : undefined,
        gender: dto.gender,
        typeDocument: dto.typeDocument,
        numberDocument: dto.numberDocument,
      },
      patient: {
        emergencyContact: dto.emergencyContact,
        bloodType: dto.bloodType,
        allergies: dto.allergies,
        chronicConditions: dto.chronicConditions,
      },
    });

    const event: PatientChangedEvent = { patientId: patient.id };
    this.eventEmitter.emit(PATIENT_CREATED_EVENT, event);

    return this.toResponse(patient);
  }

  private toResponse(p: any): PatientResponseDto {
    return {
      id: p.id,
      emergencyContact: p.emergencyContact,
      bloodType: p.bloodType,
      allergies: p.allergies,
      chronicConditions: p.chronicConditions,
      isActive: p.isActive,
      profile: {
        id: p.profile.id,
        name: p.profile.name,
        lastName: p.profile.lastName,
        email: p.profile.email,
        phone: p.profile.phone,
        birthday: p.profile.birthday,
        gender: p.profile.gender,
        typeDocument: p.profile.typeDocument,
        numberDocument: p.profile.numberDocument,
      },
      createdAt: p.createdAt,
    };
  }
}
