import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service.js';
import type { IPatientRepository } from '../../domain/repositories/patient.repository.js';
import { PatientRiskService } from '../../domain/services/patient-risk.service.js';
import { PatientRiskAccessPolicy } from '../../../../shared/access/patient-risk-access.policy.js';
import type { AuthenticatedUser } from '../../../../shared/domain/interfaces/authenticated-user.interface.js';
import { PatientRiskProfileDto } from '../dto/patient-risk-profile.dto.js';

@Injectable()
export class GetPatientRiskProfileUseCase {
  constructor(
    @Inject('IPatientRepository')
    private readonly patientRepository: IPatientRepository,
    private readonly prisma: PrismaService,
    private readonly patientRiskService: PatientRiskService,
    private readonly accessPolicy: PatientRiskAccessPolicy,
  ) {}

  async execute(
    patientId: number,
    actor: AuthenticatedUser,
  ): Promise<PatientRiskProfileDto> {
    const patient = await this.patientRepository.findById(patientId);
    if (!patient) {
      throw new NotFoundException('Paciente no encontrado');
    }

    const scope = this.accessPolicy.resolve(patient, actor);

    if (scope.clinicId !== undefined) {
      const hasRelation = await this.prisma.appointments.findFirst({
        where: {
          patientId,
          clinicId: scope.clinicId,
          deleted: false,
          ...(scope.doctorUserId !== undefined && {
            schedule: { doctor: { profile: { userId: scope.doctorUserId } } },
          }),
        },
        select: { id: true },
      });

      if (!hasRelation) {
        throw new NotFoundException('Paciente no encontrado');
      }
    }

    const scopedBase = {
      patientId,
      deleted: false,
      ...(scope.clinicId !== undefined && { clinicId: scope.clinicId }),
      ...(scope.doctorUserId !== undefined && {
        schedule: { doctor: { profile: { userId: scope.doctorUserId } } },
      }),
    };

    const [totalAppointments, noShowCount, lateCancellationCount] =
      await Promise.all([
        this.prisma.appointments.count({
          where: {
            ...scopedBase,
            OR: [
              { status: 'COMPLETED' },
              { status: 'NO_SHOW' },
              { status: 'CANCELLED', cancellationFee: { gt: 0 } },
            ],
          },
        }),
        this.prisma.appointments.count({
          where: { ...scopedBase, status: 'NO_SHOW' },
        }),
        this.prisma.appointments.count({
          where: {
            ...scopedBase,
            status: 'CANCELLED',
            cancellationFee: { gt: 0 },
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
