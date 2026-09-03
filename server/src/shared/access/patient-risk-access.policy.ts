import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../domain/interfaces/authenticated-user.interface.js';

export interface PatientAccessResource {
  id: number;
  profile?: {
    userId: number | null;
  } | null;
}

export interface PatientRiskScope {
  clinicId?: number;
  doctorUserId?: number;
}

@Injectable()
export class PatientRiskAccessPolicy {
  resolve(
    patient: PatientAccessResource,
    actor: AuthenticatedUser,
  ): PatientRiskScope {
    if (this.isGlobal(actor)) {
      return {};
    }

    if (actor.roleName === 'PATIENT') {
      if (patient.profile?.userId !== actor.id) {
        throw new NotFoundException('Paciente no encontrado');
      }
      return {};
    }

    if (actor.clinicId === null) {
      throw new ForbiddenException(
        'No tienes una sede asignada para acceder al perfil de riesgo',
      );
    }

    if (actor.roleName === 'DOCTOR') {
      return {
        clinicId: actor.clinicId,
        doctorUserId: actor.id,
      };
    }

    return {
      clinicId: actor.clinicId,
    };
  }

  private isGlobal(actor: AuthenticatedUser): boolean {
    return (
      actor.roleName === 'SUPER_ADMIN' ||
      (actor.roleName === 'ADMIN' && actor.clinicId === null)
    );
  }
}
