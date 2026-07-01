import { Inject, Injectable } from '@nestjs/common';
import type {
  ITransactionRepository,
  PaginatedTransactions,
} from '../../domain/repositories/transaction.repository.js';
import type { ListPaymentsQueryDto } from '../dto/list-payments-query.dto.js';

@Injectable()
export class ListPaymentsUseCase {
  constructor(
    @Inject('ITransactionRepository')
    private readonly transactionRepository: ITransactionRepository,
  ) {}

  async execute(
    clinicId: number | null,
    query: ListPaymentsQueryDto,
  ): Promise<PaginatedTransactions> {
    return this.transactionRepository.findAll({
      clinicId: clinicId ?? undefined,
      status: query.status,
      dateFrom: query.dateFrom ? new Date(query.dateFrom) : undefined,
      dateTo: query.dateTo ? new Date(query.dateTo) : undefined,
      page: query.page ?? 1,
      limit: query.limit ?? 20,
    });
  }
}
