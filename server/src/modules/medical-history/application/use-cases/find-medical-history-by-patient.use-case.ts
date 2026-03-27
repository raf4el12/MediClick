import {
  Injectable,
  Inject,
  ForbiddenException,
} from '@nestjs/common';
import { MedicalHistoryQueryDto } from '../dto/medical-history-query.dto.js';
import {
  PaginatedMedicalHistoryResponseDto,
  MedicalHistoryResponseDto,
} from '../dto/medical-history-response.dto.js';
import type { IMedicalHistoryRepository } from '../../domain/repositories/medical-history.repository.js';
import type { IDoctorRepository } from '../../../doctors/domain/repositories/doctor.repository.js';
import type { IPatientRepository } from '../../../patients/domain/repositories/patient.repository.js';
import { UserRole } from '../../../../shared/domain/enums/user-role.enum.js';

@Injectable()
export class FindMedicalHistoryByPatientUseCase {
  constructor(
    @Inject('IMedicalHistoryRepository')
    private readonly repository: IMedicalHistoryRepository,
    @Inject('IDoctorRepository')
    private readonly doctorRepository: IDoctorRepository,
    @Inject('IPatientRepository')
    private readonly patientRepository: IPatientRepository,
  ) {}

  async execute(
    patientId: number,
    query: MedicalHistoryQueryDto,
    userId?: number,
    role?: string,
  ): Promise<PaginatedMedicalHistoryResponseDto> {
    // Doctores solo pueden ver historial de pacientes que han atendido
    if (role === UserRole.DOCTOR && userId) {
      const doctorId =
        await this.doctorRepository.findDoctorIdByUserId(userId);
      if (!doctorId) {
        throw new ForbiddenException(
          'No se encontró un doctor asociado a este usuario',
        );
      }

      const hasRelation =
        await this.patientRepository.hasRelationWithDoctor(patientId, doctorId);
      if (!hasRelation) {
        throw new ForbiddenException(
          'No tiene permiso para ver el historial de este paciente',
        );
      }
    }

    const result = await this.repository.findByPatientId(patientId, {
      status: query.status,
      page: query.page,
      limit: query.limit,
    });

    return {
      data: result.data.map((r) => this.toResponse(r)),
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    };
  }

  private toResponse(r: any): MedicalHistoryResponseDto {
    return {
      id: r.id,
      patientId: r.patientId,
      condition: r.condition,
      description: r.description,
      diagnosedDate: r.diagnosedDate,
      status: r.status,
      notes: r.notes,
      patient: {
        id: r.patient.id,
        name: r.patient.profile.name,
        lastName: r.patient.profile.lastName,
      },
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    };
  }
}
