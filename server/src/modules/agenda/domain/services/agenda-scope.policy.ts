import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../../../../shared/domain/interfaces/authenticated-user.interface.js';

export type AgendaScope =
  | { kind: 'doctor'; doctorId: number; clinicId: number | null }
  | { kind: 'clinic'; clinicId: number };

export interface AgendaScopeQuery {
  doctorId?: number;
  clinicId?: number;
}

export interface AgendaDoctorRef {
  id: number;
  clinicId: number | null;
}

export interface AgendaScopeLookups {
  findDoctor(doctorId: number): Promise<AgendaDoctorRef | null>;
  findDoctorByUserId(userId: number): Promise<AgendaDoctorRef | null>;
  clinicExists(clinicId: number): Promise<boolean>;
}

const doctorNotFound = () => new NotFoundException('Médico no encontrado');
const clinicNotFound = () => new NotFoundException('Sede no encontrada');

/**
 * Resuelve qué agenda puede leer el actor. Global = SUPER_ADMIN o ADMIN sin
 * sede (como `AppointmentAccessPolicy`); un médico o una sede fuera de su
 * alcance responde 404 para no revelar que existen.
 */
export async function resolveAgendaScope(
  actor: AuthenticatedUser,
  query: AgendaScopeQuery,
  lookups: AgendaScopeLookups,
): Promise<AgendaScope> {
  const { doctorId, clinicId } = query;
  if (doctorId !== undefined && clinicId !== undefined) {
    throw new BadRequestException('Indica doctorId o clinicId, no ambos');
  }

  if (actor.roleName === 'PATIENT') {
    throw new ForbiddenException('El paciente no tiene acceso a la agenda');
  }

  const isGlobal =
    actor.roleName === 'SUPER_ADMIN' ||
    (actor.roleName === 'ADMIN' && actor.clinicId === null);

  if (isGlobal) {
    if (doctorId !== undefined) {
      const doctor = await lookups.findDoctor(doctorId);
      if (!doctor) throw doctorNotFound();
      return { kind: 'doctor', doctorId: doctor.id, clinicId: doctor.clinicId };
    }
    if (clinicId !== undefined) {
      if (!(await lookups.clinicExists(clinicId))) throw clinicNotFound();
      return { kind: 'clinic', clinicId };
    }
    throw new BadRequestException('Indica doctorId o clinicId');
  }

  if (actor.roleName === 'DOCTOR') {
    if (clinicId !== undefined) {
      throw new ForbiddenException('El médico solo consulta su propia agenda');
    }
    const own = await lookups.findDoctorByUserId(actor.id);
    if (!own) {
      throw new ForbiddenException('No tienes un perfil de médico');
    }
    if (doctorId !== undefined && doctorId !== own.id) throw doctorNotFound();
    return { kind: 'doctor', doctorId: own.id, clinicId: own.clinicId };
  }

  if (actor.clinicId === null) {
    throw new ForbiddenException('No tienes una sede asignada');
  }

  if (doctorId !== undefined) {
    const doctor = await lookups.findDoctor(doctorId);
    if (!doctor || doctor.clinicId !== actor.clinicId) throw doctorNotFound();
    return { kind: 'doctor', doctorId: doctor.id, clinicId: actor.clinicId };
  }

  if (clinicId !== undefined && clinicId !== actor.clinicId) {
    throw clinicNotFound();
  }
  return { kind: 'clinic', clinicId: actor.clinicId };
}
