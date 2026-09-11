import { SecurityAuditService } from './security-audit.service.js';
import { PaginationImproved } from '../utils/value-objects/pagination-improved.value-object.js';

// ─── OWASP A09: Security Logging & Monitoring ────────────────────────────────

describe('SecurityAuditService — OWASP A09', () => {
  let service: SecurityAuditService;
  let prisma: {
    securityAuditLogs: {
      create: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
    };
  };

  beforeEach(() => {
    prisma = {
      securityAuditLogs: {
        create: jest.fn().mockResolvedValue({}),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
    };
    service = new SecurityAuditService(prisma as any);
  });

  it('persiste el evento con los campos normalizados', async () => {
    await service.record({
      eventType: 'LOGIN_FAILED' as any,
      email: 'a@b.com',
      ip: '1.2.3.4',
      userAgent: 'jest',
      metadata: { reason: 'Credenciales inválidas' },
    });

    expect(prisma.securityAuditLogs.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        eventType: 'LOGIN_FAILED',
        email: 'a@b.com',
        ip: '1.2.3.4',
        userAgent: 'jest',
        userId: null,
        clinicId: null,
        resource: null,
        metadata: { reason: 'Credenciales inválidas' },
      }),
    });
  });

  it('nunca lanza si la escritura falla (no convierte 401/403 en 500)', async () => {
    prisma.securityAuditLogs.create.mockRejectedValue(new Error('db down'));

    await expect(
      service.record({ eventType: 'PERMISSION_DENIED' as any, userId: 1 }),
    ).resolves.toBeUndefined();
  });

  it('lista paginada aplica filtro por eventType y rango de fechas', async () => {
    const rows = [
      {
        id: 1,
        eventType: 'LOGIN_FAILED',
        userId: null,
        email: 'a@b.com',
        clinicId: null,
        ip: '1.2.3.4',
        userAgent: 'jest',
        resource: null,
        metadata: null,
        createdAt: new Date('2026-07-01'),
      },
    ];
    prisma.securityAuditLogs.findMany.mockResolvedValue(rows);
    prisma.securityAuditLogs.count.mockResolvedValue(1);

    const pagination = new PaginationImproved(undefined, 1, 10);
    const result = await service.findAllPaginated(pagination, {
      eventType: 'LOGIN_FAILED' as any,
      from: '2026-07-01T00:00:00.000Z',
      to: '2026-07-09T00:00:00.000Z',
    });

    expect(prisma.securityAuditLogs.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          eventType: 'LOGIN_FAILED',
          createdAt: {
            gte: new Date('2026-07-01T00:00:00.000Z'),
            lte: new Date('2026-07-09T00:00:00.000Z'),
          },
        },
        skip: 0,
        take: 10,
      }),
    );
    expect(result).toEqual({
      totalRows: 1,
      rows,
      totalPages: 1,
      currentPage: 1,
    });
  });

  it('sin filtros consulta la bitácora completa paginada', async () => {
    const pagination = new PaginationImproved(undefined, 2, 5);
    await service.findAllPaginated(pagination);

    expect(prisma.securityAuditLogs.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: {}, skip: 5, take: 5 }),
    );
    expect(prisma.securityAuditLogs.count).toHaveBeenCalledWith({ where: {} });
  });
});
