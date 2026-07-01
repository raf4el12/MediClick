import {
  Injectable,
  Inject,
  Logger,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../../../prisma/prisma.service.js';
import type { IWaitlistOfferRepository } from '../../domain/repositories/waitlist-offer.repository.js';
import type { IWaitlistEntryRepository } from '../../domain/repositories/waitlist-entry.repository.js';
import type { IPatientRepository } from '../../../patients/domain/repositories/patient.repository.js';
import type { IAppointmentRepository } from '../../../appointments/domain/repositories/appointment.repository.js';
import type { IScheduleRepository } from '../../../schedules/domain/repositories/schedule.repository.js';
import { WaitlistEntryStatus } from '../../domain/enums/waitlist-entry-status.enum.js';
import { WaitlistLockService } from '../services/waitlist-lock.service.js';
import { AcceptOfferResponseDto } from '../dto/accept-offer-response.dto.js';
import { dateToTimeString } from '../../../../shared/utils/date-time.utils.js';
import { getAppointmentPaymentTimeoutMs } from '../../../../shared/utils/payment-timeout.util.js';
import type { WaitlistOfferAcceptedEvent } from '../events/waitlist-events.interface.js';

@Injectable()
export class AcceptOfferUseCase {
  private readonly logger = new Logger(AcceptOfferUseCase.name);

  constructor(
    @Inject('IWaitlistOfferRepository')
    private readonly offerRepository: IWaitlistOfferRepository,
    @Inject('IWaitlistEntryRepository')
    private readonly entryRepository: IWaitlistEntryRepository,
    @Inject('IPatientRepository')
    private readonly patientRepository: IPatientRepository,
    @Inject('IAppointmentRepository')
    private readonly appointmentRepository: IAppointmentRepository,
    @Inject('IScheduleRepository')
    private readonly scheduleRepository: IScheduleRepository,
    private readonly lock: WaitlistLockService,
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(
    userId: number,
    offerId: number,
  ): Promise<AcceptOfferResponseDto> {
    const offer = await this.offerRepository.findById(offerId);
    if (!offer) {
      throw new NotFoundException('Oferta no encontrada');
    }

    // Autorización: la oferta debe pertenecer al paciente autenticado.
    const patient = await this.patientRepository.findByUserId(userId);
    if (!patient || patient.id !== offer.entry.patientId) {
      throw new ForbiddenException('Esta oferta no te pertenece');
    }

    // Claim atómico: gana el primer accept; un doble-click recibe Conflict.
    const claimed = await this.offerRepository.claimPending(
      offerId,
      new Date(),
    );
    if (!claimed) {
      throw new ConflictException(
        'La oferta ya no está disponible (fue aceptada o expiró)',
      );
    }

    let appointment;
    try {
      // Verifica overlap + crea la cita en una transacción serializable. Protege
      // contra una reserva directa que haya tomado el slot dentro de la ventana.
      appointment = await this.appointmentRepository.createWithOverlapCheck(
        {
          patientId: offer.entry.patientId,
          scheduleId: offer.scheduleId,
          startTime: offer.startTime,
          endTime: offer.endTime,
          reason: 'Reserva desde lista de espera',
          clinicId: offer.clinicId,
        },
        offer.startTime,
        offer.endTime,
      );
    } catch (error) {
      // El slot fue tomado entre la oferta y la aceptación. Liberamos el lock
      // para que el siguiente en cola pueda recibirlo; el paciente sigue activo.
      await this.lock.release(offer.scheduleId, offer.startTime);
      throw error instanceof ConflictException
        ? new ConflictException(
            'El horario ya fue tomado. Sigues en la lista de espera para el próximo cupo.',
          )
        : error;
    }

    // Precio + deadline de pago (mismo mecanismo que la reserva directa).
    const schedule = await this.scheduleRepository.findById(offer.scheduleId);
    const price = schedule?.specialty.price ?? null;
    const pendingUntil = new Date(
      Date.now() + getAppointmentPaymentTimeoutMs(),
    );
    await this.prisma.appointments.update({
      where: { id: appointment.id },
      data: { ...(price && price > 0 && { amount: price }), pendingUntil },
    });

    // Cierra la entrada y enlaza la cita a la oferta.
    await this.entryRepository.update(offer.waitlistEntryId, {
      status: WaitlistEntryStatus.FULFILLED,
      fulfilledAt: new Date(),
    });
    await this.offerRepository.setCreatedAppointment(offerId, appointment.id);
    await this.lock.release(offer.scheduleId, offer.startTime);

    const profile = offer.entry.patient.profile;
    const acceptedEvent: WaitlistOfferAcceptedEvent = {
      offerId,
      appointmentId: appointment.id,
      patientUserId: profile.userId,
      patientName: `${profile.name} ${profile.lastName}`,
      doctorName: `${appointment.schedule.doctor.profile.name} ${appointment.schedule.doctor.profile.lastName}`,
      clinicId: offer.clinicId,
    };
    this.eventEmitter.emit('waitlist.offer.accepted', acceptedEvent);

    this.logger.log(
      `[WAITLIST] Oferta ${offerId} aceptada por paciente ${patient.id} → cita ${appointment.id} (PENDING pago hasta ${pendingUntil.toISOString()})`,
    );

    return {
      appointmentId: appointment.id,
      scheduleId: appointment.scheduleId,
      startTime: dateToTimeString(appointment.startTime),
      endTime: dateToTimeString(appointment.endTime),
      status: appointment.status,
      paymentStatus: appointment.paymentStatus,
      amount: price && price > 0 ? price : null,
      pendingUntil,
    };
  }
}
