import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import type {
  ITransactionRepository,
  PaginatedTransactions,
} from '../../domain/repositories/transaction.repository.js';
import type { ListPaymentsQueryDto } from '../dto/list-payments-query.dto.js';
import type { AuthenticatedUser } from '../../../../shared/domain/interfaces/authenticated-user.interface.js';

@Injectable()
export class ListPaymentsUseCase {
  constructor(
    @Inject('ITransactionRepository')
    private readonly transactionRepository: ITransactionRepository,
  ) {}

  async execute(
    actor: Pick<AuthenticatedUser, 'roleName' | 'clinicId'>,
    query: ListPaymentsQueryDto,
  ): Promise<PaginatedTransactions> {
    // Sin sede, el listado no tiene filtro: solo un actor global puede verlo así.
    if (actor.clinicId === null && !this.isGlobal(actor)) {
      throw new ForbiddenException(
        'No tienes acceso al listado de transacciones',
      );
    }

    return this.transactionRepository.findAll({
      clinicId: actor.clinicId ?? undefined,
      status: query.status,
      dateFrom: query.dateFrom ? new Date(query.dateFrom) : undefined,
      dateTo: query.dateTo ? new Date(query.dateTo) : undefined,
      page: query.page ?? 1,
      limit: query.limit ?? 20,
    });
  }

  private isGlobal(actor: Pick<AuthenticatedUser, 'roleName' | 'clinicId'>) {
    return (
      actor.roleName === 'SUPER_ADMIN' ||
      (actor.roleName === 'ADMIN' && actor.clinicId === null)
    );
  }
}
