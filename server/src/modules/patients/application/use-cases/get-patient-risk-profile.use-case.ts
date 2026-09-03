import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service.js';
import type { IPatientRepository } from '../../domain/repositories/patient.repository.js';
import { PatientRiskService } from '../../domain/services/patient-risk.service.js';
import { PatientRiskProfileDto } from '../dto/patient-risk-profile.dto.js';

@Injectable()
export class GetPatientRiskProfileUseCase {
  constructor(
    @Inject('IPatientRepository')
    private readonly patientRepository: IPatientRepository,
    private readonly prisma: PrismaService,
    private readonly patientRiskService: PatientRiskService,
  ) {}

  async execute(patientId: number): Promise<PatientRiskProfileDto> {
    const patient = await this.patientRepository.findById(patientId);
    if (!patient) {
      throw new NotFoundException('Paciente no encontrado');
    }

    const [totalAppointments, noShowCount, lateCancellationCount] =
      await Promise.all([
        this.prisma.appointments.count({
          where: { patientId, deleted: false },
        }),
        this.prisma.appointments.count({
          where: { patientId, status: 'NO_SHOW', deleted: false },
        }),
        this.prisma.appointments.count({
          where: {
            patientId,
            status: 'CANCELLED',
            cancellationFee: { gt: 0 },
            deleted: false,
          },
        }),
      ]);

    const assessment = this.patientRiskService.assessRisk({
      totalAppointments,
      noShowCount,
      lateCancellationCount,
    });

    return {
      patientId,
      riskScore: assessment.riskScore,
      riskLevel: assessment.riskLevel,
      isOverbookCandidate: assessment.isOverbookCandidate,
      recommendation: assessment.recommendation,
      stats: {
        totalAppointments,
        noShowCount,
        lateCancellationCount,
      },
    };
  }
}
