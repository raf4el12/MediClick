import { NotFoundException } from '@nestjs/common';
import type { AuthenticatedUser } from '../../../../shared/domain/interfaces/authenticated-user.interface.js';
import { SystemRole } from '../../../../shared/domain/enums/permission.enum.js';
import type { PatientRecord } from '../../domain/types/patient-record.types.js';
import { GetPatientRecordUseCase } from './get-patient-record.use-case.js';

type TestScope =
  | { kind: 'GLOBAL' }
  | { kind: 'PATIENT' }
  | { kind: 'CLINIC'; clinicId: number; doctorUserId?: number };

const completeRecord: PatientRecord = {
  id: 99,
  isActive: true,
  medicalHistory: [
    { condition: 'Historia sede 1' },
    { condition: 'Historia sede 2' },
  ],
  appointments: [
    {
      id: 101,
      startTime: new Date('2026-09-01T09:00:00Z'),
      status: 'CONFIRMED',
    },
    {
      id: 202,
      startTime: new Date('2026-09-02T09:00:00Z'),
      status: 'CONFIRMED',
    },
  ],
};

const actor = (
  overrides: Partial<AuthenticatedUser>,
): AuthenticatedUser => ({
  id: 1,
  email: 'actor@mediclick.test',
  roleId: 1,
  roleName: SystemRole.DOCTOR,
  clinicId: 1,
  ...overrides,
});

describe('GetPatientRecordUseCase', () => {
  const queryPort = {
    getPatientIdByUserId: jest.fn(async (userId: number) =>
      userId === 99 ? 99 : null,
    ),
    getPatientRecord: jest.fn(
      async (_patientId: number, scope?: TestScope): Promise<PatientRecord | null> => {
        if (scope?.kind === 'CLINIC' && scope.doctorUserId === 404) {
          return null;
        }
        if (scope?.kind === 'CLINIC') {
          return {
            ...completeRecord,
            medicalHistory: [completeRecord.medicalHistory![0]],
            appointments: [completeRecord.appointments![0]],
          };
        }
        return completeRecord;
      },
    ),
  };

  let useCase: GetPatientRecordUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new GetPatientRecordUseCase(queryPort as any);
  });

  it('limits clinic staff to the current clinic', async () => {
    const result = await useCase.execute(
      99,
      actor({ id: 10, clinicId: 1, roleName: SystemRole.RECEPTIONIST }),
    );

    expect(result.appointments!.map((item) => item.id)).toEqual([101]);
    expect(result.medicalHistory!.map((item) => item.condition)).toEqual([
      'Historia sede 1',
    ]);
  });

  it('keeps the patient own record cross-clinic', async () => {
    const result = await useCase.execute(
      99,
      actor({
        id: 99,
        clinicId: null,
        roleName: SystemRole.PATIENT,
      }),
    );

    expect(result.appointments!.map((item) => item.id)).toEqual([101, 202]);
    expect(result.medicalHistory!.map((item) => item.condition)).toEqual([
      'Historia sede 1',
      'Historia sede 2',
    ]);
  });

  it('hides a patient with no care relationship from a doctor', async () => {
    await expect(
      useCase.execute(
        99,
        actor({ id: 404, clinicId: 1, roleName: SystemRole.DOCTOR }),
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it('keeps global administrators cross-clinic', async () => {
    const result = await useCase.execute(
      99,
      actor({ id: 500, clinicId: null, roleName: SystemRole.ADMIN }),
    );

    expect(result.appointments!.map((item) => item.id)).toEqual([101, 202]);
  });
});
