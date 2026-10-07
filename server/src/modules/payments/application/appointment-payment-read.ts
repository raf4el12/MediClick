import { NotFoundException } from '@nestjs/common';
import type { PrismaService } from '../../../prisma/prisma.service.js';
import type { AuthenticatedUser } from '../../../shared/domain/interfaces/authenticated-user.interface.js';
import type { AppointmentAccessPolicy } from '../../../shared/access/appointment-access.policy.js';
import type { TransactionEntity } from '../domain/entities/transaction.entity.js';
import type { PaymentResponseDto } from './dto/payment-response.dto.js';

/**
 * Verifica que el actor pueda leer los pagos de la cita (dueño, personal de su
 * sede o actor global). Cita eliminada o inexistente: 404.
 */
export async function authorizeAppointmentPaymentRead(
  prisma: PrismaService,
  policy: AppointmentAccessPolicy,
  actor: AuthenticatedUser,
  appointmentId: number,
): Promise<void> {
  const appointment = await prisma.appointments.findUnique({
    where: { id: appointmentId },
    select: {
      id: true,
      deleted: true,
      clinicId: true,
      patient: { select: { profile: { select: { userId: true } } } },
      schedule: {
        select: {
          doctor: {
            select: { clinicId: true, profile: { select: { userId: true } } },
          },
        },
      },
    },
  });
  if (!appointment || appointment.deleted) {
    throw new NotFoundException('Cita no encontrada');
  }

  policy.authorize(actor, 'READ_PAYMENT', {
    id: appointment.id,
    clinicId:
      appointment.schedule.doctor.clinicId ?? appointment.clinicId ?? null,
    patientUserId: appointment.patient.profile.userId,
    doctorUserId: appointment.schedule.doctor.profile.userId,
  });
}

export function toPaymentResponse(
  transaction: TransactionEntity,
): PaymentResponseDto {
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
