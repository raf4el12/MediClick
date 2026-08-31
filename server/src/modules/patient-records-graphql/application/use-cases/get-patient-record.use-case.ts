import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import type { IPatientRecordQueryPort } from '../../domain/interfaces/patient-record-query.port.js';
import type { PatientRecordScope } from '../../domain/interfaces/patient-record-query.port.js';
import type { PatientRecord } from '../../domain/types/patient-record.types.js';
import type { AuthenticatedUser } from '../../../../shared/domain/interfaces/authenticated-user.interface.js';

@Injectable()
export class GetPatientRecordUseCase {
  constructor(
    @Inject('IPatientRecordQueryPort')
    private readonly queryPort: IPatientRecordQueryPort,
  ) {}

  async execute(
    patientId: number,
    currentUser: AuthenticatedUser,
  ): Promise<PatientRecord> {
    const scope = await this.resolveScope(patientId, currentUser);

    const record = await this.queryPort.getPatientRecord(patientId, scope);
    if (!record) {
      throw new NotFoundException(
        'Expediente clínico no encontrado o paciente inactivo',
      );
    }
    return record;
  }

  async executeForCurrentUser(
    currentUser: AuthenticatedUser,
  ): Promise<PatientRecord> {
    const patientId = await this.queryPort.getPatientIdByUserId(currentUser.id);
    if (!patientId) {
      throw new NotFoundException(
        'No se encontró expediente clínico para tu cuenta',
      );
    }
    return this.execute(patientId, currentUser);
  }

  private async resolveScope(
    patientId: number,
    user: AuthenticatedUser,
  ): Promise<PatientRecordScope> {
    if (user.roleName === 'PATIENT') {
      const ownPatientId = await this.queryPort.getPatientIdByUserId(user.id);
      if (ownPatientId !== patientId) {
        throw new ForbiddenException(
          'No tienes permiso para ver este expediente clínico',
        );
      }
      return { kind: 'PATIENT' };
    }

    if (
      user.roleName === 'SUPER_ADMIN' ||
      (user.roleName === 'ADMIN' && user.clinicId === null)
    ) {
      return { kind: 'GLOBAL' };
    }

    if (user.clinicId === null) {
      throw new ForbiddenException(
        'No tienes una sede asignada para consultar expedientes clínicos',
      );
    }

    return {
      kind: 'CLINIC',
      clinicId: user.clinicId,
      ...(user.roleName === 'DOCTOR' && { doctorUserId: user.id }),
    };
  }
}
