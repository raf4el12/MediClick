import type { TransactionEntity } from '../entities/transaction.entity.js';
import type {
  CreateTransactionData,
  UpdateTransactionData,
} from '../interfaces/transaction-data.interface.js';

export interface ITransactionRepository {
  create(data: CreateTransactionData): Promise<TransactionEntity>;
  update(id: number, data: UpdateTransactionData): Promise<TransactionEntity>;
  findById(id: number): Promise<TransactionEntity | null>;
  findByGatewayId(gatewayId: string): Promise<TransactionEntity | null>;
  findByPreferenceId(preferenceId: string): Promise<TransactionEntity | null>;
  findLatestByAppointmentId(
    appointmentId: number,
  ): Promise<TransactionEntity | null>;
  findByAppointmentId(appointmentId: number): Promise<TransactionEntity[]>;
}
