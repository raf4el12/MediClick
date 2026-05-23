import type { TransactionEntity } from '../entities/transaction.entity.js';
import type {
  CreateTransactionData,
  UpdateTransactionData,
} from '../interfaces/transaction-data.interface.js';

export interface TransactionFilters {
  clinicId?: number | null;
  status?: string;
  dateFrom?: Date;
  dateTo?: Date;
  page: number;
  limit: number;
}

export interface PaginatedTransactions {
  data: TransactionEntity[];
  total: number;
  page: number;
  totalPages: number;
}

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
  findAll(filters: TransactionFilters): Promise<PaginatedTransactions>;
}
