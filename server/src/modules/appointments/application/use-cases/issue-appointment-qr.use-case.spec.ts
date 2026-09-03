import { NotFoundException } from '@nestjs/common';
import { IssueAppointmentQrUseCase } from './issue-appointment-qr.use-case.js';
import { AppointmentAccessPolicy } from '../../../../shared/access/appointment-access.policy.js';
import { CheckInWindowService } from '../../domain/services/check-in-window.service.js';
import type { AppointmentQrService } from '../services/appointment-qr.service.js';
import type { PrismaService } from '../../../../prisma/prisma.service.js';
import type { AuthenticatedUser } from '../../../../shared/domain/interfaces/authenticated-user.interface.js';

describe('IssueAppointmentQrUseCase', () => {
  let useCase: IssueAppointmentQrUseCase;
  let prisma: {
    appointments: { findFirst: jest.Mock };
  };
  let accessPolicy: AppointmentAccessPolicy;
  let checkInWindowService: CheckInWindowService;
  let qrService: { generateCheckInQrToken: jest.Mock };

  const ownPatient: AuthenticatedUser = {
    id: 100,
    email: 'patient@test.com',
    roleId: 1,
    roleName: 'PATIENT',
    clinicId: null,
  };

  const otherPatient: AuthenticatedUser = {
    id: 999,
    email: 'other@test.com',
    roleId: 1,
    roleName: 'PATIENT',
    clinicId: null,
  };

  const sameClinicStaff: AuthenticatedUser = {
    id: 300,
    email: 'recep@test.com',
    roleId: 2,
    roleName: 'RECEPTIONIST',
    clinicId: 1,
  };

  const otherClinicStaff: AuthenticatedUser = {
    id: 301,
    email: 'recep-other@test.com',
    roleId: 2,
    roleName: 'RECEPTIONIST',
    clinicId: 2,
  };

  const mockAppointment = {
    id: 42,
    patientId: 10,
    clinicId: 1,
    startTime: new Date('1970-01-01T09:00:00Z'),
    patient: {
      id: 10,
      profile: { userId: 100 },
    },
    schedule: {
      scheduleDate: new Date('2026-10-10T00:00:00Z'),
      doctor: {
        profile: { userId: 200 },
        clinic: { id: 1, timezone: 'America/Lima' },
      },
    },
  };

  beforeEach(() => {
    prisma = {
      appointments: {
        findFirst: jest.fn().mockResolvedValue(mockAppointment),
      },
    };

    accessPolicy = new AppointmentAccessPolicy();
    checkInWindowService = new CheckInWindowService();
    qrService = {
      generateCheckInQrToken: jest
        .fn()
        .mockReturnValue('mc_qr_signed_token_123'),
    };

    useCase = new IssueAppointmentQrUseCase(
      prisma as unknown as PrismaService,
      accessPolicy,
      checkInWindowService,
      qrService as unknown as AppointmentQrService,
    );
  });

  it('lanza NotFoundException si la cita médica no existe', async () => {
    prisma.appointments.findFirst.mockResolvedValueOnce(null);

    await expect(useCase.execute(999, ownPatient)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('lanza NotFoundException si otro paciente intenta emitir el QR', async () => {
    await expect(useCase.execute(42, otherPatient)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('lanza NotFoundException si staff de otra sede intenta emitir el QR', async () => {
    await expect(useCase.execute(42, otherClinicStaff)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('permite emitir QR al paciente dueño y calcula ventana y expiración exacta con hora 1970', async () => {
    const result = await useCase.execute(42, ownPatient);

    expect(result.appointmentId).toBe(42);
    expect(result.qrToken).toBe('mc_qr_signed_token_123');
    expect(result.opensAt.toISOString()).toBe('2026-10-10T13:30:00.000Z');
    expect(result.expiresAt.toISOString()).toBe('2026-10-10T14:15:00.000Z');

    expect(qrService.generateCheckInQrToken).toHaveBeenCalledWith(
      {
        appointmentId: 42,
        patientId: 10,
        clinicId: 1,
      },
      result.expiresAt,
    );
  });

  it('permite emitir QR a recepcionista de la misma sede', async () => {
    const result = await useCase.execute(42, sameClinicStaff);

    expect(result.appointmentId).toBe(42);
    expect(result.qrToken).toBe('mc_qr_signed_token_123');
  });
});
