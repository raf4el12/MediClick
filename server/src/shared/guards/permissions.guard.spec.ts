import { ForbiddenException, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from './permissions.guard.js';

// ─── OWASP A01: Broken Access Control ────────────────────────────────────────

function buildContext(user: any): ExecutionContext {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
    getType: () => 'http',
    switchToRpc: () => ({ getData: () => ({ user }) }),
    switchToWs: () => ({ getData: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

describe('PermissionsGuard — OWASP A01: Broken Access Control', () => {
  let guard: PermissionsGuard;
  let reflector: jest.Mocked<Reflector>;
  let redisService: { get: jest.Mock; set: jest.Mock };
  let prisma: { rolePermissions: { findMany: jest.Mock } };

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() } as any;

    redisService = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
    };

    prisma = {
      rolePermissions: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };

    guard = new PermissionsGuard(reflector, redisService as any, prisma as any);
  });

  // A01.1 — Endpoint sin decorador: acceso libre ─────────────────────────────

  it('A01.1: permite el acceso cuando el endpoint no tiene @RequirePermissions', async () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    const ctx = buildContext({ id: 1, roleId: 2 });

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(prisma.rolePermissions.findMany).not.toHaveBeenCalled();
  });

  // A01.2 — Sin usuario autenticado: debe denegar ────────────────────────────

  it('A01.2: lanza ForbiddenException si no hay usuario en el request', async () => {
    reflector.getAllAndOverride.mockReturnValue({
      action: 'READ',
      subject: 'APPOINTMENTS',
    });
    const ctx = buildContext(undefined);

    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it('A01.2: lanza ForbiddenException si el usuario no tiene roleId', async () => {
    reflector.getAllAndOverride.mockReturnValue({
      action: 'READ',
      subject: 'APPOINTMENTS',
    });
    const ctx = buildContext({ id: 1 }); // sin roleId

    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  // A01.3 — Permiso exacto coincide: concede acceso ──────────────────────────

  it('A01.3: concede acceso cuando el rol tiene el permiso exacto', async () => {
    reflector.getAllAndOverride.mockReturnValue({
      action: 'READ',
      subject: 'APPOINTMENTS',
    });
    prisma.rolePermissions.findMany.mockResolvedValue([
      { permission: { action: 'READ', subject: 'APPOINTMENTS' } },
    ]);
    const ctx = buildContext({ id: 1, roleId: 2 });

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });

  // A01.4 — Sin permiso: debe denegar ───────────────────────────────────────

  it('A01.4: lanza ForbiddenException cuando el rol no tiene el permiso requerido', async () => {
    reflector.getAllAndOverride.mockReturnValue({
      action: 'DELETE',
      subject: 'APPOINTMENTS',
    });
    prisma.rolePermissions.findMany.mockResolvedValue([
      { permission: { action: 'READ', subject: 'APPOINTMENTS' } },
    ]);
    const ctx = buildContext({ id: 1, roleId: 2 });

    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it('A01.4: lanza ForbiddenException cuando el rol no tiene ningún permiso', async () => {
    reflector.getAllAndOverride.mockReturnValue({
      action: 'READ',
      subject: 'APPOINTMENTS',
    });
    prisma.rolePermissions.findMany.mockResolvedValue([]);
    const ctx = buildContext({ id: 1, roleId: 2 });

    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  // A01.5 — Wildcards: MANAGE permite todo ──────────────────────────────────

  it('A01.5: MANAGE:ALL permite cualquier acción sobre cualquier recurso', async () => {
    reflector.getAllAndOverride.mockReturnValue({
      action: 'DELETE',
      subject: 'USERS',
    });
    prisma.rolePermissions.findMany.mockResolvedValue([
      { permission: { action: 'MANAGE', subject: 'ALL' } },
    ]);
    const ctx = buildContext({ id: 1, roleId: 1 });

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });

  it('A01.5: MANAGE:{subject} permite cualquier acción sobre ese recurso', async () => {
    reflector.getAllAndOverride.mockReturnValue({
      action: 'DELETE',
      subject: 'APPOINTMENTS',
    });
    prisma.rolePermissions.findMany.mockResolvedValue([
      { permission: { action: 'MANAGE', subject: 'APPOINTMENTS' } },
    ]);
    const ctx = buildContext({ id: 1, roleId: 2 });

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });

  it('A01.5: MANAGE:ALL no permite acceso a recursos distintos con wildcard de subject erróneo', async () => {
    // READ:ALL permite READ sobre cualquier subject
    reflector.getAllAndOverride.mockReturnValue({
      action: 'DELETE',
      subject: 'USERS',
    });
    prisma.rolePermissions.findMany.mockResolvedValue([
      { permission: { action: 'READ', subject: 'ALL' } },
    ]);
    const ctx = buildContext({ id: 1, roleId: 2 });

    // READ:ALL no cubre DELETE
    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  // A01.6 — Caché de permisos ───────────────────────────────────────────────

  it('A01.6: usa caché de Redis en lugar de consultar BD si los permisos ya están cacheados', async () => {
    reflector.getAllAndOverride.mockReturnValue({
      action: 'READ',
      subject: 'APPOINTMENTS',
    });
    redisService.get.mockResolvedValue(
      JSON.stringify([{ action: 'READ', subject: 'APPOINTMENTS' }]),
    );
    const ctx = buildContext({ id: 1, roleId: 2 });

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(prisma.rolePermissions.findMany).not.toHaveBeenCalled();
  });

  it('A01.6: cachea los permisos en Redis tras un cache miss', async () => {
    reflector.getAllAndOverride.mockReturnValue({
      action: 'READ',
      subject: 'APPOINTMENTS',
    });
    redisService.get.mockResolvedValue(null);
    prisma.rolePermissions.findMany.mockResolvedValue([
      { permission: { action: 'READ', subject: 'APPOINTMENTS' } },
    ]);
    const ctx = buildContext({ id: 1, roleId: 2 });

    await guard.canActivate(ctx);

    expect(redisService.set).toHaveBeenCalledWith(
      expect.stringContaining('2'),
      expect.stringContaining('APPOINTMENTS'),
      expect.any(Number),
    );
  });
});
