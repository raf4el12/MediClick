import {
  Injectable,
  Inject,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { IAppointmentRepository } from '../../domain/repositories/appointment.repository.js';
import { AppointmentQrService } from '../services/appointment-qr.service.js';
import { ProcessQrCheckInDto } from '../dto/process-qr-check-in.dto.js';
import { CheckInTicketResponseDto } from '../dto/check-in-ticket-response.dto.js';
import { AppointmentStatus } from '../../../../shared/domain/enums/appointment-status.enum.js';

@Injectable()
export class ProcessQrCheckInUseCase {
  private readonly logger = new Logger(ProcessQrCheckInUseCase.name);

  constructor(
    @Inject('IAppointmentRepository')
    private readonly appointmentRepository: IAppointmentRepository,
    private readonly qrService: AppointmentQrService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(dto: ProcessQrCheckInDto): Promise<CheckInTicketResponseDto> {
    // 1. Validar firma y vigencia del token QR
    const validation = this.qrService.validateCheckInQrToken(dto.qrToken);
    if (!validation.valid || !validation.payload) {
      throw new BadRequestException(
        validation.error || 'Token QR de cita inválido o no reconocido',
      );
    }

    const { appointmentId } = validation.payload;

    // 2. Obtener cita y verificar existencia
    const appointment =
      await this.appointmentRepository.findById(appointmentId);
    if (!appointment || appointment.deleted) {
      throw new NotFoundException('Cita no encontrada en el sistema');
    }

    // 3. Verificar aislamiento de sede (si el kiosco pertenece a una sede específica)
    const appointmentClinicId =
      appointment.schedule.doctor.clinic?.id ?? appointment.clinicId;
    if (
      dto.kioskClinicId &&
      appointmentClinicId &&
      appointmentClinicId !== dto.kioskClinicId
    ) {
      throw new ForbiddenException(
        'Esta cita médica pertenece a otra sede de la clínica',
      );
    }

    // 4. Validar estado de la cita
    const allowedStatuses = [
      AppointmentStatus.PENDING,
      AppointmentStatus.CONFIRMED,
    ];
    if (!allowedStatuses.includes(appointment.status)) {
      throw new BadRequestException(
        `No se puede realizar check-in. La cita ya se encuentra en estado ${appointment.status}`,
      );
    }

    // 5. Registrar presencia y actualizar estado a IN_PROGRESS con timestamp de llegada
    const arrivalTime = new Date();
    const updated = await this.appointmentRepository.update(appointmentId, {
      status: AppointmentStatus.IN_PROGRESS,
      checkedInAt: arrivalTime,
      updatedAt: arrivalTime,
    });

    const turnCode = `T-${appointment.id}`;
    const patientFullName = `${appointment.patient.profile.name} ${appointment.patient.profile.lastName}`;
    const doctorFullName = `${appointment.schedule.doctor.profile.name} ${appointment.schedule.doctor.profile.lastName}`;

    // 6. Emitir evento de presencia para pantalla de llamado en sala y consultorio
    this.eventEmitter.emit('appointment.checked_in', {
      appointmentId: appointment.id,
      clinicId: appointmentClinicId,
      patientId: appointment.patientId,
      patientName: patientFullName,
      doctorId: appointment.schedule.doctor.id,
      doctorName: doctorFullName,
      specialtyName: appointment.schedule.specialty.name,
      turnCode,
      checkedInAt: arrivalTime,
    });

    this.logger.log(
      `[CHECK-IN QR] Paciente ${patientFullName} llegó a sala | Cita #${appointment.id} | Turno ${turnCode} | Sede ${appointmentClinicId}`,
    );

    return {
      appointmentId: updated.id,
      turnCode,
      patientName: patientFullName,
      doctorName: doctorFullName,
      specialtyName: appointment.schedule.specialty.name,
      status: updated.status,
      checkedInAt: arrivalTime,
    };
  }
}
