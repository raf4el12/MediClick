import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service.js';
import type { ITransactionRepository } from '../../domain/repositories/transaction.repository.js';
import { PaymentResponseDto } from '../dto/payment-response.dto.js';

@Injectable()
export class GetPaymentByAppointmentUseCase {
  constructor(
    private readonly prisma: PrismaService,
    @Inject('ITransactionRepository')
    private readonly transactionRepository: ITransactionRepository,
  ) {}

  async execute(
    userId: number,
    role: string,
    appointmentId: number,
  ): Promise<PaymentResponseDto> {
    const appointment = await this.prisma.appointments.findUnique({
      where: { id: appointmentId },
      select: {
        id: true,
        deleted: true,
        patient: {
          select: { profile: { select: { userId: true } } },
        },
      },
    });
    if (!appointment || appointment.deleted) {
      throw new NotFoundException('Cita no encontrada');
    }

    // Pacientes solo pueden ver sus propios pagos. Staff (DOCTOR/RECEPTIONIST/ADMIN) pueden ver cualquiera.
    if (
      role === 'PATIENT' &&
      appointment.patient.profile.userId !== userId
    ) {
      throw new ForbiddenException('Esta cita no te pertenece');
    }

    const transaction =
      await this.transactionRepository.findLatestByAppointmentId(appointmentId);
    if (!transaction) {
      throw new NotFoundException(
        'No hay pagos registrados para esta cita',
      );
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
