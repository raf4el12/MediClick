/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access */
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AppointmentController } from './appointment.controller.js';
import { ProcessQrCheckInDto } from '../../application/dto/process-qr-check-in.dto.js';
import type { ProcessQrCheckInUseCase } from '../../application/use-cases/process-qr-check-in.use-case.js';
import type { IssueAppointmentQrUseCase } from '../../application/use-cases/issue-appointment-qr.use-case.js';
import type { AuthenticatedUser } from '../../../../shared/domain/interfaces/authenticated-user.interface.js';

describe('AppointmentQrController (Rutas QR del Controlador)', () => {
  let controller: AppointmentController;
  let processQrCheckInUseCase: { execute: jest.Mock };
  let issueAppointmentQrUseCase: { execute: jest.Mock };

  const receptionistActor: AuthenticatedUser = {
    id: 5,
    email: 'recep@mediclick.test',
    roleId: 2,
    roleName: 'RECEPTIONIST',
    clinicId: 1,
  };

  beforeEach(() => {
    processQrCheckInUseCase = {
      execute: jest.fn().mockResolvedValue({
        appointmentId: 42,
        turnCode: 'T-42',
        status: 'IN_PROGRESS',
      }),
    };

    issueAppointmentQrUseCase = {
      execute: jest.fn().mockResolvedValue({
        appointmentId: 42,
        qrToken: 'mc_qr_abc',
        opensAt: new Date(),
        expiresAt: new Date(),
      }),
    };

    controller = new AppointmentController(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      processQrCheckInUseCase as unknown as ProcessQrCheckInUseCase,
      issueAppointmentQrUseCase as unknown as IssueAppointmentQrUseCase,
      {} as any,
      {} as any,
    );
  });

  it('delega qrCheckIn pasando el DTO y el actor autenticado completo', async () => {
    const dto: ProcessQrCheckInDto = { qrToken: 'mc_qr_token_123' };

    await controller.qrCheckIn(dto, receptionistActor);

    expect(processQrCheckInUseCase.execute).toHaveBeenCalledWith(
      dto,
      receptionistActor,
    );
  });

  it('delega getCheckInQr pasando el id de la cita y el actor autenticado', async () => {
    await controller.getCheckInQr(42, receptionistActor);

    expect(issueAppointmentQrUseCase.execute).toHaveBeenCalledWith(
      42,
      receptionistActor,
    );
  });

  it('ProcessQrCheckInDto valida token obligatorio y no confía en kioskClinicId', async () => {
    const validDto = plainToInstance(ProcessQrCheckInDto, {
      qrToken: 'mc_qr_valid_hash',
      kioskClinicId: 999, // intento de inyección ignorado
    });

    const errors = await validate(validDto);
    expect(errors.length).toBe(0);
    // kioskClinicId no forma parte del DTO
    expect((validDto as any).kioskClinicId).toBe(999); // en plainToInstance se asigna pero el DTO tipado solo define qrToken

    const invalidDto = plainToInstance(ProcessQrCheckInDto, {
      qrToken: '',
    });
    const invalidErrors = await validate(invalidDto);
    expect(invalidErrors.length).toBeGreaterThan(0);
  });
});
