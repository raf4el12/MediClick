import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import type { IPatientRecordQueryPort } from '../../domain/interfaces/patient-record-query.port.js';
import type { PatientRecord } from '../../domain/types/patient-record.types.js';
import type { AuthenticatedUser } from '../../../../shared/domain/interfaces/authenticated-user.interface.js';
import { SystemRole } from '../../../../shared/domain/enums/permission.enum.js';

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
    await this.assertAccess(patientId, currentUser);

    const record = await this.queryPort.getPatientRecord(patientId);
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

  private async assertAccess(
    patientId: number,
    user: AuthenticatedUser,
  ): Promise<void> {
    if (user.roleName !== SystemRole.PATIENT) return;

    const ownPatientId = await this.queryPort.getPatientIdByUserId(user.id);
    if (ownPatientId !== patientId) {
      throw new ForbiddenException(
        'No tienes permiso para ver este expediente clínico',
      );
    }
  }
}
