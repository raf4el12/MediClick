import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { SystemRole } from '../../../../shared/domain/enums/permission.enum.js';
import { UpdateClinicUseCase } from './update-clinic.use-case.js';

// ─── OWASP A01: Broken Access Control (defense-in-depth) ─────────────────────

describe('UpdateClinicUseCase — OWASP A01', () => {
  let useCase: UpdateClinicUseCase;
  let repo: {
    findById: jest.Mock;
    existsByNameExcluding: jest.Mock;
    update: jest.Mock;
  };

  const clinicRow = (id: number) => ({
    id,
    name: `Sede ${id}`,
    address: 'x',
    phone: 'x',
    email: 'x',
    timezone: 'America/Lima',
    currency: 'PEN',
    isActive: true,
    createdAt: new Date(),
  });

  beforeEach(() => {
    repo = {
      findById: jest.fn().mockImplementation((id: number) => clinicRow(id)),
      existsByNameExcluding: jest.fn().mockResolvedValue(false),
      update: jest.fn().mockImplementation((id: number) => clinicRow(id)),
    };
    useCase = new UpdateClinicUseCase(repo as any);
  });

  it('deniega a un admin clínico-scopeado (custom role) modificar OTRA sede', async () => {
    await expect(
      useCase.execute(2, { phone: '999' } as any, 1, 'ADMIN_LIMA'),
    ).rejects.toThrow(ForbiddenException);
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('permite a un admin clínico-scopeado modificar su PROPIA sede', async () => {
    await expect(
      useCase.execute(1, { phone: '999' } as any, 1, 'ADMIN_LIMA'),
    ).resolves.toMatchObject({ id: 1 });
    expect(repo.update).toHaveBeenCalledWith(1, expect.anything());
  });

  it('permite a un rol de plataforma (ADMIN) modificar cualquier sede', async () => {
    await expect(
      useCase.execute(2, { phone: '999' } as any, 1, SystemRole.ADMIN),
    ).resolves.toMatchObject({ id: 2 });
    expect(repo.update).toHaveBeenCalledWith(2, expect.anything());
  });

  it('lanza NotFound antes de evaluar tenant si la sede no existe', async () => {
    repo.findById.mockResolvedValueOnce(null);
    await expect(
      useCase.execute(99, {} as any, 1, 'ADMIN_LIMA'),
    ).rejects.toThrow(NotFoundException);
  });
});
