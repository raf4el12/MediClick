import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service.js';
import type { ITransactionRepository } from '../../domain/repositories/transaction.repository.js';
import type {
  PaymentMethodValue,
  PaymentStatusValue,
  TransactionEntity,
} from '../../domain/entities/transaction.entity.js';
import type {
  CreateTransactionData,
  UpdateTransactionData,
} from '../../domain/interfaces/transaction-data.interface.js';

@Injectable()
export class PrismaTransactionRepository implements ITransactionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateTransactionData): Promise<TransactionEntity> {
    const row = await this.prisma.transactions.create({
      data: {
        appointmentId: data.appointmentId,
        amount: data.amount,
        currency: data.currency ?? 'PEN',
        paymentMethod: data.paymentMethod ?? null,
        status: data.status,
        gatewayId: data.gatewayId ?? null,
        preferenceId: data.preferenceId ?? null,
        externalRef: data.externalRef ?? null,
        payerEmail: data.payerEmail ?? null,
        metadata: (data.metadata ?? null) as never,
        clinicId: data.clinicId ?? null,
      },
    });
    return this.toEntity(row);
  }

  async update(
    id: number,
    data: UpdateTransactionData,
  ): Promise<TransactionEntity> {
    const row = await this.prisma.transactions.update({
      where: { id },
      data: {
        ...(data.status !== undefined && { status: data.status }),
        ...(data.paymentMethod !== undefined && {
          paymentMethod: data.paymentMethod,
        }),
        ...(data.gatewayId !== undefined && { gatewayId: data.gatewayId }),
        ...(data.payerEmail !== undefined && { payerEmail: data.payerEmail }),
        ...(data.failureReason !== undefined && {
          failureReason: data.failureReason,
        }),
        ...(data.paidAt !== undefined && { paidAt: data.paidAt }),
        ...(data.metadata !== undefined && {
          metadata: data.metadata as never,
        }),
        updatedAt: new Date(),
      },
    });
    return this.toEntity(row);
  }

  async findById(id: number): Promise<TransactionEntity | null> {
    const row = await this.prisma.transactions.findUnique({ where: { id } });
    return row ? this.toEntity(row) : null;
  }

  async findByGatewayId(gatewayId: string): Promise<TransactionEntity | null> {
    const row = await this.prisma.transactions.findFirst({
      where: { gatewayId },
    });
    return row ? this.toEntity(row) : null;
  }

  async findByPreferenceId(
    preferenceId: string,
  ): Promise<TransactionEntity | null> {
    const row = await this.prisma.transactions.findFirst({
      where: { preferenceId },
    });
    return row ? this.toEntity(row) : null;
  }

  async findLatestByAppointmentId(
    appointmentId: number,
  ): Promise<TransactionEntity | null> {
    const row = await this.prisma.transactions.findFirst({
      where: { appointmentId },
      orderBy: { createdAt: 'desc' },
    });
    return row ? this.toEntity(row) : null;
  }

  async findByAppointmentId(
    appointmentId: number,
  ): Promise<TransactionEntity[]> {
    const rows = await this.prisma.transactions.findMany({
      where: { appointmentId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => this.toEntity(r));
  }

  private toEntity(row: {
    id: number;
    appointmentId: number;
    amount: unknown;
    currency: string;
    paymentMethod: string | null;
    status: string;
    gatewayId: string | null;
    preferenceId: string | null;
    externalRef: string | null;
    payerEmail: string | null;
    failureReason: string | null;
    paidAt: Date | null;
    metadata: unknown;
    clinicId: number | null;
    createdAt: Date;
    updatedAt: Date | null;
  }): TransactionEntity {
    return {
      id: row.id,
      appointmentId: row.appointmentId,
      amount: Number(row.amount),
      currency: row.currency,
      paymentMethod: row.paymentMethod as PaymentMethodValue | null,
      status: row.status as PaymentStatusValue,
      gatewayId: row.gatewayId,
      preferenceId: row.preferenceId,
      externalRef: row.externalRef,
      payerEmail: row.payerEmail,
      failureReason: row.failureReason,
      paidAt: row.paidAt,
      metadata: row.metadata,
      clinicId: row.clinicId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
