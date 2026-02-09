import {
  Injectable,
  Inject,
  UnauthorizedException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { AuthResponseDto } from '../dto/auth-response.dto.js';
import type { ITokenService } from '../../domain/contracts/token-service.interface.js';
import type { IRefreshTokenRepository } from '../../domain/contracts/refresh-token-repository.interface.js';
import type { IUserRepository } from '../../../users/domain/repositories/user.repository.js';

@Injectable()
export class RefreshTokenUseCase {
  private readonly logger = new Logger(RefreshTokenUseCase.name);

  constructor(
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
    @Inject('ITokenService')
    private readonly tokenService: ITokenService,
    @Inject('IRefreshTokenRepository')
    private readonly refreshTokenRepository: IRefreshTokenRepository,
  ) {}

  async execute(
    rawRefreshToken: string,
    userId: number,
    deviceId: string,
  ): Promise<AuthResponseDto> {
    let storedData;
    try {
      storedData = await this.refreshTokenRepository.findByUserDevice(
        userId,
        deviceId,
      );
    } catch {
      this.logger.error('Redis unavailable during refresh token validation');
      throw new ServiceUnavailableException(
        'Servicio de autenticación temporalmente no disponible',
      );
    }

    if (!storedData) {
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }

    const incomingHash = this.tokenService.hashToken(rawRefreshToken);

    // Reuse detection: token was already rotated → potential theft
    if (incomingHash !== storedData.tokenHash) {
      this.logger.warn(
        `Refresh token reuse detected for user ${userId}, device ${deviceId}. Revoking all sessions.`,
      );
      await this.refreshTokenRepository.deleteAllByUser(userId);
      throw new UnauthorizedException(
        'Se detectó reutilización de token. Todas las sesiones han sido cerradas por seguridad.',
      );
    }

    const user = await this.userRepository.findById(userId);

    if (!user || !user.isActive || user.deleted) {
      await this.refreshTokenRepository.deleteAllByUser(userId);
      throw new UnauthorizedException('Acceso denegado');
    }

    // Rotate: generate new tokens
    const accessToken = await this.tokenService.generateAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    const newRawRefreshToken = this.tokenService.generateOpaqueRefreshToken();
    const newTokenHash = this.tokenService.hashToken(newRawRefreshToken);
    const ttl = this.tokenService.getRefreshTokenTtlSeconds();

    // Save rotated token, keeping same family
    await this.refreshTokenRepository.save(
      {
        tokenHash: newTokenHash,
        tokenFamily: storedData.tokenFamily,
        userId: user.id,
        deviceId,
        createdAt: Date.now(),
      },
      ttl,
    );

    return {
      accessToken,
      refreshToken: newRawRefreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }
}
