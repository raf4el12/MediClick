import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service.js';
import type { ITransactionRepository } from '../../domain/repositories/transaction.repository.js';
import type { IPaymentGatewayService } from '../../domain/services/payment-gateway.service.js';
import { CreatePreferenceDto } from '../dto/create-preference.dto.js';
import { PreferenceResponseDto } from '../dto/preference-response.dto.js';

@Injectable()
export class CreatePaymentPreferenceUseCase {
  private readonly logger = new Logger(CreatePaymentPreferenceUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject('ITransactionRepository')
    private readonly transactionRepository: ITransactionRepository,
    @Inject('IPaymentGatewayService')
    private readonly gateway: IPaymentGatewayService,
  ) {}

  async execute(
    userId: number,
    dto: CreatePreferenceDto,
  ): Promise<PreferenceResponseDto> {
    const appointment = await this.prisma.appointments.findUnique({
      where: { id: dto.appointmentId },
      include: {
        patient: {
          select: {
            id: true,
            profile: { select: { userId: true, user: { select: { email: true } } } },
          },
        },
        schedule: {
          select: {
            specialty: { select: { name: true, price: true } },
            scheduleDate: true,
          },
        },
      },
    });

    if (!appointment || appointment.deleted) {
      throw new NotFoundException('Cita no encontrada');
    }
    if (appointment.patient.profile.userId !== userId) {
      throw new ForbiddenException('Esta cita no te pertenece');
    }
    if (appointment.paymentStatus !== 'PENDING') {
      throw new BadRequestException(
        `La cita ya tiene un pago en estado ${appointment.paymentStatus}`,
      );
    }
    if (appointment.status !== 'PENDING') {
      throw new BadRequestException(
        `La cita no está en estado pagable (status=${appointment.status})`,
      );
    }

    const now = new Date();
    if (appointment.pendingUntil && appointment.pendingUntil <= now) {
      throw new BadRequestException(
        'El tiempo para pagar esta cita ha expirado',
      );
    }

    const specialtyPrice = appointment.schedule.specialty.price
      ? Number(appointment.schedule.specialty.price)
      : null;
    if (!specialtyPrice || specialtyPrice <= 0) {
      throw new BadRequestException(
        'La especialidad de esta cita no tiene precio configurado',
      );
    }

    const amount = appointment.amount
      ? Number(appointment.amount)
      : specialtyPrice;

    const successUrl =
      process.env.MP_SUCCESS_URL ?? 'http://localhost:3000/payment/success';
    const failureUrl =
      process.env.MP_FAILURE_URL ?? 'http://localhost:3000/payment/failure';
    const pendingUrl =
      process.env.MP_PENDING_URL ?? 'http://localhost:3000/payment/pending';
    const notificationUrl = process.env.MP_NOTIFICATION_URL;
    if (!notificationUrl) {
      throw new BadRequestException(
        'MP_NOTIFICATION_URL no está configurado en el servidor',
      );
    }

    const payerEmail = appointment.patient.profile.user?.email ?? null;

    const expiresInMs = appointment.pendingUntil
      ? Math.max(60_000, appointment.pendingUntil.getTime() - now.getTime())
      : undefined;

    const preference = await this.gateway.createPreference({
      externalReference: String(appointment.id),
      items: [
        {
          id: String(appointment.id),
          title: `Consulta: ${appointment.schedule.specialty.name}`,
          description: `Cita #${appointment.id}`,
          quantity: 1,
          unitPrice: amount,
          currencyId: 'PEN',
        },
      ],
      payerEmail: payerEmail ?? undefined,
      backUrls: {
        success: successUrl,
        failure: failureUrl,
        pending: pendingUrl,
      },
      notificationUrl,
      expiresInMs,
    });

    await this.transactionRepository.create({
      appointmentId: appointment.id,
      amount,
      currency: 'PEN',
      status: 'PENDING',
      preferenceId: preference.preferenceId,
      externalRef: String(appointment.id),
      payerEmail: payerEmail ?? null,
      clinicId: appointment.clinicId ?? null,
    });

    this.logger.log(
      `[AUDIT] Preference created | appointmentId=${appointment.id} preferenceId=${preference.preferenceId} amount=${amount}`,
    );

    return preference;
  }
}
