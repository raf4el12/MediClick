import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { SystemRole } from '../domain/enums/permission.enum.js';
import type { AuthenticatedUser } from '../domain/interfaces/authenticated-user.interface.js';
import {
  AppointmentAccessPolicy,
  type AppointmentAccessResource,
} from './appointment-access.policy.js';

const actor = (overrides: Partial<AuthenticatedUser>): AuthenticatedUser => ({
  id: 1,
  email: 'actor@mediclick.test',
  roleId: 1,
  roleName: SystemRole.RECEPTIONIST,
  clinicId: 7,
  ...overrides,
});

const appointment = (
  overrides: Partial<AppointmentAccessResource> = {},
): AppointmentAccessResource => ({
  id: 10,
  clinicId: 7,
  patientUserId: 100,
  doctorUserId: 200,
  ...overrides,
});

describe('AppointmentAccessPolicy', () => {
  const policy = new AppointmentAccessPolicy();

  it('allows patients to read payment, cancel and reschedule only their own appointment', () => {
    const patient = actor({
      id: 100,
      roleName: SystemRole.PATIENT,
      clinicId: null,
    });

    expect(() =>
      policy.authorize(patient, 'READ_PAYMENT', appointment()),
    ).not.toThrow();
    expect(() =>
      policy.authorize(patient, 'CANCEL', appointment()),
    ).not.toThrow();
    expect(() =>
      policy.authorize(patient, 'RESCHEDULE', appointment()),
    ).not.toThrow();
    expect(() =>
      policy.authorize(patient, 'CANCEL', appointment({ patientUserId: 999 })),
    ).toThrow(NotFoundException);
  });

  it('forbids clinical state operations to patients even on their own appointment', () => {
    const patient = actor({
      id: 100,
      roleName: SystemRole.PATIENT,
      clinicId: null,
    });

    for (const operation of [
      'CHECK_IN',
      'CONFIRM',
      'COMPLETE',
      'MARK_NO_SHOW',
    ] as const) {
      expect(() => policy.authorize(patient, operation, appointment())).toThrow(
        ForbiddenException,
      );
    }
  });

  it('limits clinic staff to appointments owned by their clinic', () => {
    const receptionist = actor({
      id: 300,
      roleName: SystemRole.RECEPTIONIST,
      clinicId: 7,
    });

    expect(() =>
      policy.authorize(receptionist, 'READ_PAYMENT', appointment()),
    ).not.toThrow();
    expect(() =>
      policy.authorize(
        receptionist,
        'READ_PAYMENT',
        appointment({ clinicId: 8 }),
      ),
    ).toThrow(NotFoundException);
  });

  it('limits doctors to their own appointments within the clinic', () => {
    const doctor = actor({
      id: 200,
      roleName: SystemRole.DOCTOR,
      clinicId: 7,
    });

    expect(() =>
      policy.authorize(doctor, 'COMPLETE', appointment()),
    ).not.toThrow();
    expect(() =>
      policy.authorize(doctor, 'COMPLETE', appointment({ doctorUserId: 201 })),
    ).toThrow(NotFoundException);
  });

  it('allows global administrators and rejects unscoped non-global staff', () => {
    const globalAdmin = actor({
      roleName: SystemRole.ADMIN,
      clinicId: null,
    });
    const unscopedStaff = actor({
      roleName: SystemRole.RECEPTIONIST,
      clinicId: null,
    });

    expect(() =>
      policy.authorize(globalAdmin, 'READ_PAYMENT', appointment()),
    ).not.toThrow();
    expect(() =>
      policy.authorize(unscopedStaff, 'READ_PAYMENT', appointment()),
    ).toThrow(ForbiddenException);
  });

  it('permite ISSUE_QR a paciente dueño, staff y médico de la misma sede, y admin global', () => {
    const ownPatient = actor({
      id: 100,
      roleName: SystemRole.PATIENT,
      clinicId: null,
    });
    const otherPatient = actor({
      id: 999,
      roleName: SystemRole.PATIENT,
      clinicId: null,
    });
    const sameClinicReceptionist = actor({
      id: 300,
      roleName: SystemRole.RECEPTIONIST,
      clinicId: 7,
    });
    const otherClinicReceptionist = actor({
      id: 301,
      roleName: SystemRole.RECEPTIONIST,
      clinicId: 8,
    });
    const assignedDoctor = actor({
      id: 200,
      roleName: SystemRole.DOCTOR,
      clinicId: 7,
    });
    const otherDoctor = actor({
      id: 201,
      roleName: SystemRole.DOCTOR,
      clinicId: 7,
    });
    const globalAdmin = actor({
      roleName: SystemRole.ADMIN,
      clinicId: null,
    });

    const appt = appointment();

    expect(() => policy.authorize(ownPatient, 'ISSUE_QR', appt)).not.toThrow();
    expect(() => policy.authorize(otherPatient, 'ISSUE_QR', appt)).toThrow(
      NotFoundException,
    );
    expect(() =>
      policy.authorize(sameClinicReceptionist, 'ISSUE_QR', appt),
    ).not.toThrow();
    expect(() =>
      policy.authorize(otherClinicReceptionist, 'ISSUE_QR', appt),
    ).toThrow(NotFoundException);
    expect(() =>
      policy.authorize(assignedDoctor, 'ISSUE_QR', appt),
    ).not.toThrow();
    expect(() => policy.authorize(otherDoctor, 'ISSUE_QR', appt)).toThrow(
      NotFoundException,
    );
    expect(() => policy.authorize(globalAdmin, 'ISSUE_QR', appt)).not.toThrow();
  });
});
