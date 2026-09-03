import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../domain/interfaces/authenticated-user.interface.js';

export type AppointmentOperation =
  | 'READ_PAYMENT'
  | 'CANCEL'
  | 'RESCHEDULE'
  | 'CHECK_IN'
  | 'CONFIRM'
  | 'COMPLETE'
  | 'MARK_NO_SHOW'
  | 'ISSUE_QR';

export interface AppointmentAccessResource {
  id: number;
  clinicId: number | null;
  patientUserId: number | null;
  doctorUserId: number | null;
}

const PATIENT_OPERATIONS = new Set<AppointmentOperation>([
  'READ_PAYMENT',
  'CANCEL',
  'RESCHEDULE',
  'ISSUE_QR',
]);

@Injectable()
export class AppointmentAccessPolicy {
  authorize(
    actor: AuthenticatedUser,
    operation: AppointmentOperation,
    appointment: AppointmentAccessResource,
  ): void {
    if (this.isGlobal(actor)) return;

    if (actor.roleName === 'PATIENT') {
      if (appointment.patientUserId !== actor.id) {
        throw new NotFoundException('Cita no encontrada');
      }
      if (!PATIENT_OPERATIONS.has(operation)) {
        throw new ForbiddenException(
          'El paciente no puede ejecutar esta operación sobre la cita',
        );
      }
      return;
    }

    if (actor.clinicId === null) {
      throw new ForbiddenException(
        'No tienes una sede asignada para operar esta cita',
      );
    }

    if (
      appointment.clinicId === null ||
      appointment.clinicId !== actor.clinicId
    ) {
      throw new NotFoundException('Cita no encontrada');
    }

    if (actor.roleName === 'DOCTOR' && appointment.doctorUserId !== actor.id) {
      throw new NotFoundException('Cita no encontrada');
    }
  }

  private isGlobal(actor: AuthenticatedUser): boolean {
    return (
      actor.roleName === 'SUPER_ADMIN' ||
      (actor.roleName === 'ADMIN' && actor.clinicId === null)
    );
  }
}
