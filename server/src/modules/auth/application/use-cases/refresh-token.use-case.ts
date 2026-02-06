import { Injectable, Inject, UnauthorizedException } from '@nestjs/common';
import { AuthResponseDto } from '../dto/auth-response.dto.js';
import { PasswordService } from '../../domain/services/password.service.js';
import { TokenService } from '../../domain/services/token.service.js';
import type { IUserRepository } from '../../../users/domain/repositories/user.repository.js';

@Injectable()
export class RefreshTokenUseCase {
  constructor(
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
  ) {}

  async execute(refreshToken: string): Promise<AuthResponseDto> {
    const payload = await this.tokenService
      .verifyRefreshToken(refreshToken)
      .catch(() => {
        throw new UnauthorizedException('Refresh token inválido o expirado');
      });

    const user = await this.userRepository.findById(payload.sub);

    if (!user || !user.isActive || user.deleted || !user.refreshToken) {
      throw new UnauthorizedException('Acceso denegado');
    }

    const isRefreshTokenValid = await this.passwordService.compare(
      refreshToken,
      user.refreshToken,
    );

    if (!isRefreshTokenValid) {
      throw new UnauthorizedException('Refresh token inválido');
    }

    const tokens = await this.tokenService.generateTokens({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    const hashedRefreshToken = await this.passwordService.hash(
      tokens.refreshToken,
    );
    await this.userRepository.updateRefreshToken(user.id, hashedRefreshToken);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }
}
