import {
  UnauthorizedException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { RefreshTokenUseCase } from './refresh-token.use-case.js';
import type { IUserRepository } from '../../../users/domain/repositories/user.repository.js';
import type { ITokenService } from '../../domain/contracts/token-service.interface.js';
import type { IRefreshTokenRepository } from '../../domain/contracts/refresh-token-repository.interface.js';
import { UserEntity } from '../../../users/domain/entities/user.entity.js';

// ─── OWASP A07: Identification and Authentication Failures ────────────────────
// Específicamente: Refresh Token Rotation + Reuse Detection

describe('RefreshTokenUseCase — OWASP A07: Auth Failures', () => {
  let useCase: RefreshTokenUseCase;
  let userRepository: jest.Mocked<Pick<IUserRepository, 'findById'>>;
  let tokenService: jest.Mocked<ITokenService>;
  let refreshTokenRepository: jest.Mocked<IRefreshTokenRepository>;
  let prisma: any;

  const mockUser: UserEntity = {
    id: 1,
    name: 'Ana Gómez',
    email: 'ana@mediclick.com',
    password: 'hashed',
    photo: null,
    roleId: 4,
    roleName: 'PATIENT',
    isActive: true,
    validateEmail: true,
    clinicId: null,
    clinicName: null,
    clinicTimezone: null,
    deleted: false,
    createdAt: new Date(),
    updatedAt: null,
  };

  const storedToken = {
    tokenHash: 'hashed-refresh-token',
    tokenFamily: 'family-uuid',
    userId: 1,
    deviceId: 'device-1',
    createdAt: Date.now(),
  };

  beforeEach(() => {
    userRepository = { findById: jest.fn().mockResolvedValue(mockUser) };

    tokenService = {
      generateAccessToken: jest.fn().mockResolvedValue('new-access-token'),
      generateOpaqueRefreshToken: jest.fn().mockReturnValue('new-raw-refresh'),
      hashToken: jest.fn().mockReturnValue('hashed-refresh-token'),
      getRefreshTokenTtlSeconds: jest.fn().mockReturnValue(604800),
      verifyAccessToken: jest.fn(),
    };

    refreshTokenRepository = {
      save: jest.fn().mockResolvedValue(undefined),
      findByUserDevice: jest.fn().mockResolvedValue(storedToken),
      findAllByUser: jest.fn(),
      deleteByUserDevice: jest.fn(),
      deleteAllByUser: jest.fn().mockResolvedValue(undefined),
    };

    prisma = {
      rolePermissions: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };

    useCase = new RefreshTokenUseCase(
      userRepository as any,
      tokenService,
      refreshTokenRepository,
      prisma,
    );
  });

  // A07.1 — Rotación normal: emite nuevos tokens ─────────────────────────────

  it('A07.1: rota el token correctamente y devuelve nuevos access + refresh tokens', async () => {
    const result = await useCase.execute('raw-refresh-token', 1, 'device-1');

    expect(result.accessToken).toBe('new-access-token');
    expect(result.refreshToken).toBe('new-raw-refresh');
    expect(refreshTokenRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        tokenFamily: 'family-uuid',
        userId: 1,
        deviceId: 'device-1',
      }),
      604800,
    );
  });

  // A07.2 — Token inexistente o expirado ────────────────────────────────────

  it('A07.2: lanza UnauthorizedException si no existe token para el usuario/dispositivo', async () => {
    refreshTokenRepository.findByUserDevice.mockResolvedValue(null);

    await expect(
      useCase.execute('raw-refresh-token', 1, 'device-1'),
    ).rejects.toThrow(UnauthorizedException);
  });

  // A07.3 — Detección de reutilización de token (token reuse detection) ──────

  it('A07.3: detecta reutilización — el hash no coincide → revoca TODAS las sesiones', async () => {
    // El hash que genera el guard es diferente al almacenado
    tokenService.hashToken.mockReturnValue('DIFFERENT-HASH');

    await expect(
      useCase.execute('stale-refresh-token', 1, 'device-1'),
    ).rejects.toThrow(UnauthorizedException);

    // CRÍTICO: debe cerrar TODAS las sesiones del usuario (no solo la actual)
    expect(refreshTokenRepository.deleteAllByUser).toHaveBeenCalledWith(1);
  });

  it('A07.3: el mensaje de error al reutilizar el token indica cierre de sesiones', async () => {
    tokenService.hashToken.mockReturnValue('DIFFERENT-HASH');

    await expect(
      useCase.execute('stale-refresh-token', 1, 'device-1'),
    ).rejects.toThrow(
      expect.objectContaining({
        message: expect.stringContaining('sesiones'),
      }),
    );
  });

  // A07.4 — Usuario inactivo o eliminado: revocar sesión ────────────────────

  it('A07.4: lanza UnauthorizedException si el usuario está desactivado', async () => {
    userRepository.findById.mockResolvedValue({ ...mockUser, isActive: false });

    await expect(
      useCase.execute('raw-refresh-token', 1, 'device-1'),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('A07.4: lanza UnauthorizedException si el usuario está eliminado', async () => {
    userRepository.findById.mockResolvedValue({ ...mockUser, deleted: true });

    await expect(
      useCase.execute('raw-refresh-token', 1, 'device-1'),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('A07.4: revoca las sesiones del usuario inactivo para evitar tokens huérfanos', async () => {
    userRepository.findById.mockResolvedValue({ ...mockUser, isActive: false });

    await expect(
      useCase.execute('raw-refresh-token', 1, 'device-1'),
    ).rejects.toThrow();

    expect(refreshTokenRepository.deleteAllByUser).toHaveBeenCalledWith(1);
  });

  // A07.5 — Resiliencia: Redis caído no crashea el servidor ─────────────────

  it('A07.5: lanza ServiceUnavailableException (no 500) si Redis está caído', async () => {
    refreshTokenRepository.findByUserDevice.mockRejectedValue(
      new Error('Redis connection refused'),
    );

    await expect(
      useCase.execute('raw-refresh-token', 1, 'device-1'),
    ).rejects.toThrow(ServiceUnavailableException);
  });
});
