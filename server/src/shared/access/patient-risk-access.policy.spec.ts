import { ForbiddenException, NotFoundException } from '@nestjs/common';
import {
  PatientRiskAccessPolicy,
  type PatientAccessResource,
} from './patient-risk-access.policy.js';
import type { AuthenticatedUser } from '../domain/interfaces/authenticated-user.interface.js';

describe('PatientRiskAccessPolicy', () => {
  let policy: PatientRiskAccessPolicy;

  const patient: PatientAccessResource = {
    id: 1,
    profile: { userId: 42 },
  };

  const ownPatientActor: AuthenticatedUser = {
    id: 42,
    email: 'own@patient.test',
    roleId: 1,
    roleName: 'PATIENT',
    clinicId: null,
  };

  const otherPatientActor: AuthenticatedUser = {
    id: 99,
    email: 'other@patient.test',
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

  const globalAdmin: AuthenticatedUser = {
    id: 1,
    email: 'admin@global.test',
    roleId: 4,
    roleName: 'ADMIN',
    clinicId: null,
  };

  const globalSuperAdmin: AuthenticatedUser = {
    id: 2,
    email: 'superadmin@global.test',
    roleId: 5,
    roleName: 'SUPER_ADMIN',
    clinicId: null,
  };

  beforeEach(() => {
    policy = new PatientRiskAccessPolicy();
  });

  it('permite al propio paciente leer su perfil de riesgo y retorna scope vacío (cross-clinic)', () => {
    expect(() => policy.resolve(patient, ownPatientActor)).not.toThrow();
    expect(policy.resolve(patient, ownPatientActor)).toEqual({});
  });

  it('oculta con NotFoundException el perfil si otro paciente intenta leerlo', () => {
    expect(() => policy.resolve(patient, otherPatientActor)).toThrow(
      NotFoundException,
    );
  });

  it('retorna scope acotado a la sede para recepcionista o staff de clínica', () => {
    expect(policy.resolve(patient, clinicReceptionist)).toEqual({
      clinicId: 7,
    });
  });

  it('retorna scope acotado a la sede y al doctor para un médico', () => {
    expect(policy.resolve(patient, clinicDoctor)).toEqual({
      clinicId: 7,
      doctorUserId: 20,
    });
  });

  it('retorna scope vacío para administradores globales', () => {
    expect(policy.resolve(patient, globalAdmin)).toEqual({});
    expect(policy.resolve(patient, globalSuperAdmin)).toEqual({});
  });

  it('rechaza con ForbiddenException a roles de sede sin sede asignada', () => {
    const unassignedStaff: AuthenticatedUser = {
      id: 30,
      email: 'unassigned@test',
      roleId: 2,
      roleName: 'RECEPTIONIST',
      clinicId: null,
    };
    const unassignedDoc: AuthenticatedUser = {
      id: 31,
      email: 'unassigned-doc@test',
      roleId: 3,
      roleName: 'DOCTOR',
      clinicId: null,
    };

    expect(() => policy.resolve(patient, unassignedStaff)).toThrow(
      ForbiddenException,
    );
    expect(() => policy.resolve(patient, unassignedDoc)).toThrow(
      ForbiddenException,
    );
  });
});
