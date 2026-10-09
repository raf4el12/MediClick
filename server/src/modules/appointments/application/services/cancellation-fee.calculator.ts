import type { ISpecialtyRepository } from '../../../specialties/domain/repositories/specialty.repository.js';
import type { ITransactionRepository } from '../../../payments/domain/repositories/transaction.repository.js';
import type { AppointmentWithRelations } from '../../domain/interfaces/appointment-data.interface.js';
import type { TimezoneResolverService } from '../../../../shared/services/timezone-resolver.service.js';
import type { CancellationPolicyService } from '../../domain/services/cancellation-policy.service.js';
import { nowInTimezone } from '../../../../shared/utils/date-time.utils.js';

export interface CancellationFeeResult {
  fee: number;
  hoursUntilAppointment: number;
  freeCancellationWindowHours: number;
}

/**
 * Penalización por cancelación de una cita, tal como la cobra la cancelación del
 * paciente: horas hasta la cita en la zona de su sede, fondos cobrados (PAID,
 * PARTIAL o una transacción PAID) y la ventana gratuita de la especialidad o de la sede.
 * La comparten la cancelación y su vista previa para que no diverjan.
 */
export class CancellationFeeCalculator {
  constructor(
    private readonly specialtyRepository: Pick<
      ISpecialtyRepository,
      'findById'
    >,
    private readonly transactionRepository: Pick<
      ITransactionRepository,
      'findLatestByAppointmentId'
    >,
    private readonly timezoneResolver: Pick<
      TimezoneResolverService,
      'resolveByDoctorId'
    >,
    private readonly cancellationPolicyService: CancellationPolicyService,
  ) {}

  async calculate(
    appointment: AppointmentWithRelations,
    { isPatient }: { isPatient: boolean },
  ): Promise<CancellationFeeResult> {
    const tz = await this.timezoneResolver.resolveByDoctorId(
      appointment.schedule.doctor.id,
    );
    const now = nowInTimezone(tz);
    const scheduleDate = new Date(appointment.schedule.scheduleDate);
    const appointmentDateTime = new Date(
      scheduleDate.getUTCFullYear(),
      scheduleDate.getUTCMonth(),
      scheduleDate.getUTCDate(),
      appointment.startTime.getUTCHours(),
      appointment.startTime.getUTCMinutes(),
    );
    const hoursUntilAppointment =
      (appointmentDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    const specialty = await this.specialtyRepository.findById(
      appointment.schedule.specialty.id,
    );
    const freeCancellationWindowHours =
      this.cancellationPolicyService.resolveWindowHours({
        specialtyWindowHours: specialty?.cancellationWindowHours ?? null,
        clinicDefaultWindowHours:
          appointment.schedule.doctor.clinic?.defaultCancellationWindowHours ??
          null,
      });

    const tx = await this.transactionRepository.findLatestByAppointmentId(
      appointment.id,
    );
    const hasFunding =
      appointment.paymentStatus === 'PAID' ||
      appointment.paymentStatus === 'PARTIAL' ||
      tx?.status === 'PAID';

    if (!isPatient || !hasFunding) {
      return { fee: 0, hoursUntilAppointment, freeCancellationWindowHours };
    }

    const calculation = this.cancellationPolicyService.calculateFee({
      hoursUntilAppointment,
      freeCancellationWindowHours,
      appointmentPrice: specialty?.price ?? 0,
      depositAmount: appointment.depositAmount ?? null,
      isPaid: true,
      isPatient: true,
    });

    return {
      fee: calculation.fee,
      hoursUntilAppointment,
      freeCancellationWindowHours,
    };
  }
}
