import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service.js';
import type { ITransactionRepository } from '../../domain/repositories/transaction.repository.js';
import { PaymentResponseDto } from '../dto/payment-response.dto.js';
import { HandlePaymentWebhookUseCase } from './handle-payment-webhook.use-case.js';
import type { AuthenticatedUser } from '../../../../shared/domain/interfaces/authenticated-user.interface.js';
import { AppointmentAccessPolicy } from '../../../../shared/access/appointment-access.policy.js';

@Injectable()
export class GetPaymentByAppointmentUseCase {
  constructor(
    private readonly prisma: PrismaService,
    @Inject('ITransactionRepository')
    private readonly transactionRepository: ITransactionRepository,
    private readonly handlePaymentWebhookUseCase: HandlePaymentWebhookUseCase,
    private readonly appointmentAccessPolicy: AppointmentAccessPolicy,
  ) {}

  async execute(
    actor: AuthenticatedUser,
    appointmentId: number,
    paymentId?: string,
  ): Promise<PaymentResponseDto> {
    const appointment = await this.prisma.appointments.findUnique({
      where: { id: appointmentId },
      select: {
        id: true,
        deleted: true,
        clinicId: true,
        patient: {
          select: { profile: { select: { userId: true } } },
        },
        schedule: {
          select: {
            doctor: {
              select: {
                clinicId: true,
                profile: { select: { userId: true } },
              },
            },
          },
        },
      },
    });
    if (!appointment || appointment.deleted) {
      throw new NotFoundException('Cita no encontrada');
    }

    this.appointmentAccessPolicy.authorize(actor, 'READ_PAYMENT', {
      id: appointment.id,
      clinicId:
        appointment.schedule.doctor.clinicId ?? appointment.clinicId ?? null,
      patientUserId: appointment.patient.profile.userId,
      doctorUserId: appointment.schedule.doctor.profile.userId,
    });

    let transaction =
      await this.transactionRepository.findLatestByAppointmentId(appointmentId);

    if (!transaction) {
      throw new NotFoundException('No hay pagos registrados para esta cita');
    }

    if (transaction.status === 'PENDING' && paymentId) {
      await this.handlePaymentWebhookUseCase.execute({
        type: 'payment',
        data: { id: paymentId },
      });
      // Re-fetch transaction to get updated status
      transaction =
        await this.transactionRepository.findLatestByAppointmentId(
          appointmentId,
        );
      if (!transaction) {
        throw new NotFoundException('No hay pagos registrados para esta cita');
      }
    }

    return {
      id: transaction.id,
      appointmentId: transaction.appointmentId,
      amount: transaction.amount,
      currency: transaction.currency,
      status: transaction.status,
      paymentMethod: transaction.paymentMethod,
      gatewayId: transaction.gatewayId,
      payerEmail: transaction.payerEmail,
      failureReason: transaction.failureReason,
      paidAt: transaction.paidAt,
      createdAt: transaction.createdAt,
    };
  }
}
