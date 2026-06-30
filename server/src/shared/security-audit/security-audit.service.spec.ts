import { SecurityAuditService } from './security-audit.service.js';

// ─── OWASP A09: Security Logging & Monitoring ────────────────────────────────

describe('SecurityAuditService — OWASP A09', () => {
  let service: SecurityAuditService;
  let prisma: { securityAuditLogs: { create: jest.Mock } };

  beforeEach(() => {
    prisma = { securityAuditLogs: { create: jest.fn().mockResolvedValue({}) } };
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
});
