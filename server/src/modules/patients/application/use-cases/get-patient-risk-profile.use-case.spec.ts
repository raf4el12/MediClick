import { NotFoundException } from '@nestjs/common';
import { GetPatientRiskProfileUseCase } from './get-patient-risk-profile.use-case.js';
import { PatientRiskService } from '../../domain/services/patient-risk.service.js';
import type { IPatientRepository } from '../../domain/repositories/patient.repository.js';
import type { PrismaService } from '../../../../prisma/prisma.service.js';

describe('GetPatientRiskProfileUseCase (Yield/Overbooking Controlado)', () => {
  let useCase: GetPatientRiskProfileUseCase;
  let patientRepository: jest.Mocked<Pick<IPatientRepository, 'findById'>>;
  let prisma: {
    appointments: { count: jest.Mock<Promise<number>, [unknown]> };
  };
  let riskService: PatientRiskService;

  beforeEach(() => {
    patientRepository = {
      findById: jest.fn().mockResolvedValue({ id: 1, profileId: 10 }),
    } as unknown as jest.Mocked<Pick<IPatientRepository, 'findById'>>;

    prisma = {
      appointments: {
        count: jest.fn<Promise<number>, [unknown]>(),
      },
    };

    riskService = new PatientRiskService();

    useCase = new GetPatientRiskProfileUseCase(
      patientRepository as unknown as IPatientRepository,
      prisma as unknown as PrismaService,
      riskService,
    );
  });

  it('lanza NotFoundException si el paciente no existe', async () => {
    patientRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute(999)).rejects.toThrow(NotFoundException);
  });

  it('RED->GREEN: calcula estadísticas y perfil de riesgo alto para paciente con faltas', async () => {
    // 1st call: total appointments = 10
    // 2nd call: no-show count = 3
    // 3rd call: late cancellation count = 1
    prisma.appointments.count
      .mockResolvedValueOnce(10)
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(1);

    const result = await useCase.execute(1);

    expect(result.patientId).toBe(1);
    expect(result.riskLevel).toBe('HIGH');
    expect(result.isOverbookCandidate).toBe(true);
    expect(result.stats.totalAppointments).toBe(10);
    expect(result.stats.noShowCount).toBe(3);
    expect(result.stats.lateCancellationCount).toBe(1);
    expect(result.recommendation).toContain('sobrecupo');
  });

  it('RED->GREEN: clasifica como bajo riesgo a paciente con historial limpio', async () => {
    prisma.appointments.count
      .mockResolvedValueOnce(10)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);

    const result = await useCase.execute(1);

    expect(result.riskLevel).toBe('LOW');
    expect(result.isOverbookCandidate).toBe(false);
    expect(result.stats.noShowCount).toBe(0);
  });
});
