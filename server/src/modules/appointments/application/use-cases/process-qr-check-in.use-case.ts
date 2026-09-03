import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { IAppointmentRepository } from '../../domain/repositories/appointment.repository.js';
import { AppointmentQrService } from '../services/appointment-qr.service.js';
import { CheckInWindowService } from '../../domain/services/check-in-window.service.js';
import { ProcessQrCheckInDto } from '../dto/process-qr-check-in.dto.js';
import { CheckInTicketResponseDto } from '../dto/check-in-ticket-response.dto.js';
import { AppointmentStatus } from '../../../../shared/domain/enums/appointment-status.enum.js';
import type { AuthenticatedUser } from '../../../../shared/domain/interfaces/authenticated-user.interface.js';

@Injectable()
export class ProcessQrCheckInUseCase {
  private readonly logger = new Logger(ProcessQrCheckInUseCase.name);

  constructor(
    @Inject('IAppointmentRepository')
    private readonly appointmentRepository: IAppointmentRepository,
    private readonly qrService: AppointmentQrService,
    private readonly checkInWindowService: CheckInWindowService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(
    dto: ProcessQrCheckInDto,
    actor: AuthenticatedUser,
  ): Promise<CheckInTicketResponseDto> {
    // 1. Autorización: sólo personal autenticado con sede asignada puede consumir QR
    if (actor.roleName === 'PATIENT' || !actor.clinicId) {
      throw new ForbiddenException(
        'El check-in por QR requiere personal autenticado con sede asignada',
      );
    }

    // 2. Validar firma criptográfica y vigencia básica del token QR
    const validation = this.qrService.validateCheckInQrToken(dto.qrToken);
    if (!validation.valid || !validation.payload) {
      throw new BadRequestException(
        validation.error || 'Token QR de cita inválido o no reconocido',
      );
    }

    const { appointmentId } = validation.payload;

    // 3. Obtener cita y verificar existencia
    const appointment =
      await this.appointmentRepository.findById(appointmentId);
    if (!appointment || appointment.deleted) {
      throw new NotFoundException('Cita no encontrada en el sistema');
    }

    // 4. Verificar aislamiento estricto de sede respecto al personal autenticado
    const appointmentClinicId =
      appointment.schedule.doctor.clinic?.id ?? appointment.clinicId;
    if (!appointmentClinicId || appointmentClinicId !== actor.clinicId) {
      throw new NotFoundException('Cita no encontrada en el sistema');
    }

    // 5. Validar estado asistencial permitido para check-in
    const allowedStatuses = [
      AppointmentStatus.PENDING,
      AppointmentStatus.CONFIRMED,
    ];
    if (!allowedStatuses.includes(appointment.status)) {
      throw new BadRequestException(
        `No se puede realizar check-in. La cita ya se encuentra en estado ${appointment.status}`,
      );
    }

    // 6. Validar ventana de llegada en la zona horaria local de la sede [T-30m, T+15m]
    const timezone =
      appointment.schedule.doctor.clinic?.timezone ?? 'America/Lima';
    const now = new Date();
    if (
      !this.checkInWindowService.isOpen(
        {
          scheduleDate: appointment.schedule.scheduleDate,
          startTime: appointment.startTime,
          timezone,
        },
        now,
      )
    ) {
      throw new BadRequestException(
        'La cita se encuentra fuera de la ventana permitida de check-in',
      );
    }

    // 7. Transición condicional atómica a IN_PROGRESS (single-winner boundary)
    const arrivalTime = new Date();
    const updated = await this.appointmentRepository.checkInAtomically({
      appointmentId,
      clinicId: appointmentClinicId,
      checkedInAt: arrivalTime,
    });

    if (!updated) {
      throw new ConflictException(
        'No se pudo realizar el check-in: la cita ya fue procesada, cancelada o no se encuentra disponible',
      );
    }

    const turnCode = `T-${updated.id}`;
    const patientFullName = `${updated.patient.profile.name} ${updated.patient.profile.lastName}`;
    const doctorFullName = `${updated.schedule.doctor.profile.name} ${updated.schedule.doctor.profile.lastName}`;

    // 8. Emitir evento de presencia únicamente tras ganar la transición atómica
    this.eventEmitter.emit('appointment.checked_in', {
      appointmentId: updated.id,
      clinicId: appointmentClinicId,
      patientId: updated.patientId,
      patientName: patientFullName,
      doctorId: updated.schedule.doctor.id,
      doctorName: doctorFullName,
      specialtyName: updated.schedule.specialty.name,
      turnCode,
      checkedInAt: updated.checkedInAt ?? arrivalTime,
    });

    this.logger.log(
      `[CHECK-IN QR] Cita #${updated.id} registrada | Turno ${turnCode} | Sede ${appointmentClinicId}`,
    );

    return {
      appointmentId: updated.id,
      turnCode,
      patientName: patientFullName,
      doctorName: doctorFullName,
      specialtyName: updated.schedule.specialty.name,
      status: updated.status,
      checkedInAt: updated.checkedInAt ?? arrivalTime,
    };
  }
}
