import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { PatientHistoryResponseDto } from '../dto/patient-history-response.dto.js';
import type { IPatientRepository } from '../../domain/repositories/patient.repository.js';

function dateToTimeString(date: Date): string {
  const h = date.getHours().toString().padStart(2, '0');
  const m = date.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
}

@Injectable()
export class GetPatientHistoryUseCase {
  constructor(
    @Inject('IPatientRepository')
    private readonly patientRepository: IPatientRepository,
  ) {}

  async execute(id: number): Promise<PatientHistoryResponseDto> {
    const patient = await this.patientRepository.findByIdWithHistory(id);
    if (!patient) {
      throw new NotFoundException('Paciente no encontrado');
    }

    return {
      id: patient.id,
      emergencyContact: patient.emergencyContact,
      bloodType: patient.bloodType,
      allergies: patient.allergies,
      chronicConditions: patient.chronicConditions,
      isActive: patient.isActive,
      profile: {
        id: patient.profile.id,
        name: patient.profile.name,
        lastName: patient.profile.lastName,
        email: patient.profile.email,
        phone: patient.profile.phone,
        birthday: patient.profile.birthday,
        gender: patient.profile.gender,
        typeDocument: patient.profile.typeDocument,
        numberDocument: patient.profile.numberDocument,
      },
      createdAt: patient.createdAt,
      appointments: patient.appointments.map((a) => ({
        id: a.id,
        reason: a.reason,
        status: a.status,
        scheduleDate: a.schedule.scheduleDate,
        timeFrom: dateToTimeString(a.schedule.timeFrom),
        timeTo: dateToTimeString(a.schedule.timeTo),
        doctorName: `${a.schedule.doctor.profile.name} ${a.schedule.doctor.profile.lastName}`,
        specialtyName: a.schedule.specialty.name,
        createdAt: a.createdAt,
      })),
    };
  }
}
