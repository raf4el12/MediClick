/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { NotFoundException } from '@nestjs/common';
import { GetPatientRiskProfileUseCase } from './get-patient-risk-profile.use-case.js';
import { PatientRiskService } from '../../domain/services/patient-risk.service.js';
import { PatientRiskAccessPolicy } from '../../../../shared/access/patient-risk-access.policy.js';
import type { IPatientRepository } from '../../domain/repositories/patient.repository.js';
import type { PrismaService } from '../../../../prisma/prisma.service.js';
import type { AuthenticatedUser } from '../../../../shared/domain/interfaces/authenticated-user.interface.js';

describe('GetPatientRiskProfileUseCase (Yield/Overbooking Controlado)', () => {
  let useCase: GetPatientRiskProfileUseCase;
  let patientRepository: jest.Mocked<Pick<IPatientRepository, 'findById'>>;
  let prisma: {
    appointments: {
      count: jest.Mock<Promise<number>, [unknown]>;
      findFirst: jest.Mock<Promise<unknown>, [unknown]>;
    };
  };
  let riskService: PatientRiskService;
  let accessPolicy: PatientRiskAccessPolicy;

  const globalAdmin: AuthenticatedUser = {
    id: 1,
    email: 'admin@global.test',
    roleId: 4,
    roleName: 'ADMIN',
    clinicId: null,
  };

  const ownPatient: AuthenticatedUser = {
    id: 42,
    email: 'patient@mediclick.test',
    roleId: 1,
    roleName: 'PATIENT',
    clinicId: null,
  };

  const otherPatient: AuthenticatedUser = {
    id: 99,
    email: 'other@mediclick.test',
    roleId: 1,
    roleName: 'PATIENT',
    clinicId: null,
  };

  const clinicReceptionist: AuthenticatedUser = {
    id: 10,
    email: 'recep@clinic.test',
    roleId: 2,
    roleName: 'RECEPTIONIST',
    clinicId: 7,
  };

  const clinicDoctor: AuthenticatedUser = {
    id: 20,
    email: 'doc@clinic.test',
    roleId: 3,
    roleName: 'DOCTOR',
    clinicId: 7,
  };

  beforeEach(() => {
    patientRepository = {
      findById: jest.fn().mockResolvedValue({
        id: 1,
        profileId: 10,
        profile: { userId: 42 },
      }),
    } as unknown as jest.Mocked<Pick<IPatientRepository, 'findById'>>;

    prisma = {
      appointments: {
        count: jest.fn<Promise<number>, [unknown]>(),
        findFirst: jest.fn<Promise<unknown>, [unknown]>(),
      },
    };

    riskService = new PatientRiskService();
    accessPolicy = new PatientRiskAccessPolicy();

    useCase = new GetPatientRiskProfileUseCase(
      patientRepository as unknown as IPatientRepository,
      prisma as unknown as PrismaService,
      riskService,
      accessPolicy,
    );
  });

  it('lanza NotFoundException si el paciente no existe', async () => {
    patientRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute(999, globalAdmin)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('lanza NotFoundException si el actor es otro paciente', async () => {
    await expect(useCase.execute(1, otherPatient)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('lanza NotFoundException si staff de clínica consulta paciente sin citas en su sede', async () => {
    prisma.appointments.findFirst.mockResolvedValue(null);

    await expect(useCase.execute(1, clinicReceptionist)).rejects.toThrow(
      NotFoundException,
    );
    expect(prisma.appointments.findFirst).toHaveBeenCalledWith({
      where: {
        patientId: 1,
        clinicId: 7,
        deleted: false,
      },
      select: { id: true },
    });
  });

  it('lanza NotFoundException si doctor consulta paciente sin citas con él', async () => {
    prisma.appointments.findFirst.mockResolvedValue(null);

    await expect(useCase.execute(1, clinicDoctor)).rejects.toThrow(
      NotFoundException,
    );
    expect(prisma.appointments.findFirst).toHaveBeenCalledWith({
      where: {
        patientId: 1,
        clinicId: 7,
        deleted: false,
        schedule: { doctor: { profile: { userId: 20 } } },
      },
      select: { id: true },
    });
  });

  it('permite a paciente propio consultar su perfil sin verificar citas de clínica', async () => {
    prisma.appointments.count.mockResolvedValue(0);

    const result = await useCase.execute(1, ownPatient);

    expect(result.patientId).toBe(1);
    expect(prisma.appointments.findFirst).not.toHaveBeenCalled();
    expect(prisma.appointments.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          patientId: 1,
          deleted: false,
          OR: [
            { status: 'COMPLETED' },
            { status: 'NO_SHOW' },
            { status: 'CANCELLED', cancellationFee: { gt: 0 } },
          ],
        }),
      }),
    );
  });

  it('permite a staff de clínica si existe cita en su sede y acota estadísticas', async () => {
    prisma.appointments.findFirst.mockResolvedValue({ id: 100 });
    prisma.appointments.count.mockResolvedValue(0);

    const result = await useCase.execute(1, clinicReceptionist);

    expect(result.patientId).toBe(1);
    expect(prisma.appointments.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          patientId: 1,
          clinicId: 7,
          deleted: false,
          OR: [
            { status: 'COMPLETED' },
            { status: 'NO_SHOW' },
            { status: 'CANCELLED', cancellationFee: { gt: 0 } },
          ],
        }),
      }),
    );
  });

  it('permite a doctor si existe cita con él y acota estadísticas a sede y doctor', async () => {
    prisma.appointments.findFirst.mockResolvedValue({ id: 100 });
    prisma.appointments.count.mockResolvedValue(0);

    const result = await useCase.execute(1, clinicDoctor);

    expect(result.patientId).toBe(1);
    expect(prisma.appointments.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          patientId: 1,
          clinicId: 7,
          schedule: { doctor: { profile: { userId: 20 } } },
          deleted: false,
          OR: [
            { status: 'COMPLETED' },
            { status: 'NO_SHOW' },
            { status: 'CANCELLED', cancellationFee: { gt: 0 } },
          ],
        }),
      }),
    );
  });

  it('RED->GREEN: calcula estadísticas y perfil de riesgo alto para paciente con faltas', async () => {
    prisma.appointments.count
      .mockResolvedValueOnce(10)
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(1);

    const result = await useCase.execute(1, globalAdmin);

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

    const result = await useCase.execute(1, globalAdmin);

    expect(result.riskLevel).toBe('LOW');
    expect(result.isOverbookCandidate).toBe(false);
    expect(result.stats.noShowCount).toBe(0);
  });
});
