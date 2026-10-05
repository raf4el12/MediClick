import { ForbiddenException } from '@nestjs/common';
import { ListPaymentsUseCase } from './list-payments.use-case.js';
import { SystemRole } from '../../../../shared/domain/enums/permission.enum.js';
import type { ITransactionRepository } from '../../domain/repositories/transaction.repository.js';

describe('ListPaymentsUseCase', () => {
  let useCase: ListPaymentsUseCase;
  let transactionRepository: jest.Mocked<
    Pick<ITransactionRepository, 'findAll'>
  >;

  beforeEach(() => {
    transactionRepository = {
      findAll: jest.fn().mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        totalPages: 0,
      }),
    } as unknown as jest.Mocked<Pick<ITransactionRepository, 'findAll'>>;

    useCase = new ListPaymentsUseCase(
      transactionRepository as unknown as ITransactionRepository,
    );
  });

  it('rechaza a un actor sin sede que no es global, como un paciente', async () => {
    await expect(
      useCase.execute({ roleName: SystemRole.PATIENT, clinicId: null }, {}),
    ).rejects.toThrow(ForbiddenException);
    expect(transactionRepository.findAll).not.toHaveBeenCalled();
  });
  it('el personal con sede solo lista las transacciones de su sede', async () => {
    await useCase.execute(
      { roleName: SystemRole.RECEPTIONIST, clinicId: 3 },
      {},
    );

    expect(transactionRepository.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ clinicId: 3 }),
    );
  });

  it('un actor global lista sin filtro de sede', async () => {
    await useCase.execute(
      { roleName: SystemRole.SUPER_ADMIN, clinicId: null },
      {},
    );

    const [filters] = transactionRepository.findAll.mock.calls[0];
    expect(filters.clinicId).toBeUndefined();
  });
});
