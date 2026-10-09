import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import type { IAppointmentRepository } from '../../domain/repositories/appointment.repository.js';
import type { ISpecialtyRepository } from '../../../specialties/domain/repositories/specialty.repository.js';
import type { ITransactionRepository } from '../../../payments/domain/repositories/transaction.repository.js';
import { TimezoneResolverService } from '../../../../shared/services/timezone-resolver.service.js';
import { AppointmentAccessPolicy } from '../../../../shared/access/appointment-access.policy.js';
import { CancellationPolicyService } from '../../domain/services/cancellation-policy.service.js';
import { AppointmentStatus } from '../../../../shared/domain/enums/appointment-status.enum.js';
import { UserRole } from '../../../../shared/domain/enums/user-role.enum.js';
import type { AuthenticatedUser } from '../../../../shared/domain/interfaces/authenticated-user.interface.js';
import { DEFAULT_CURRENCY } from '../../../../shared/constants/defaults.constant.js';
import { CancellationFeeCalculator } from '../services/cancellation-fee.calculator.js';
import type { CancellationPreviewResponseDto } from '../dto/cancellation-preview-response.dto.js';

// Los mismos estados que rechaza `CancelAppointmentUseCase`.
const NOT_CANCELLABLE = new Set<string>([
  AppointmentStatus.COMPLETED,
  AppointmentStatus.CANCELLED,
]);

/** Anticipa la penalización que cobraría cancelar ahora, sin cancelar. */
@Injectable()
export class GetCancellationPreviewUseCase {
  private readonly feeCalculator: CancellationFeeCalculator;

  constructor(
    @Inject('IAppointmentRepository')
    private readonly appointmentRepository: IAppointmentRepository,
    @Inject('ISpecialtyRepository')
    specialtyRepository: ISpecialtyRepository,
    @Inject('ITransactionRepository')
    transactionRepository: ITransactionRepository,
    timezoneResolver: TimezoneResolverService,
    private readonly appointmentAccessPolicy: AppointmentAccessPolicy,
    cancellationPolicyService: CancellationPolicyService,
  ) {
    this.feeCalculator = new CancellationFeeCalculator(
      specialtyRepository,
      transactionRepository,
      timezoneResolver,
      cancellationPolicyService,
    );
  }

  async execute(
    id: number,
    actor: AuthenticatedUser,
  ): Promise<CancellationPreviewResponseDto> {
    const appointment = await this.appointmentRepository.findById(id);
    if (!appointment) {
      throw new NotFoundException('Cita no encontrada');
    }

    this.appointmentAccessPolicy.authorize(actor, 'CANCEL', {
      id: appointment.id,
      clinicId: appointment.schedule.doctor.clinic?.id ?? appointment.clinicId,
      patientUserId: appointment.patient.profile.userId,
      doctorUserId: appointment.schedule.doctor.profile.userId ?? null,
    });

    const cancellable = !NOT_CANCELLABLE.has(appointment.status);
    const { fee, hoursUntilAppointment, freeCancellationWindowHours } =
      await this.feeCalculator.calculate(appointment, {
        isPatient: actor.roleName === String(UserRole.PATIENT),
      });

    return {
      fee: cancellable ? fee : 0,
      currency:
        appointment.schedule.doctor.clinic?.currency ?? DEFAULT_CURRENCY,
      freeCancellationWindowHours,
      hoursUntilAppointment,
      cancellable,
    };
  }
}
