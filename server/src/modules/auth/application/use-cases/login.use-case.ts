import { Injectable, Inject, UnauthorizedException } from '@nestjs/common';
import { LoginDto } from '../dto/login.dto.js';
import { AuthResponseDto } from '../dto/auth-response.dto.js';
import { PasswordService } from '../../domain/services/password.service.js';
import { TokenService } from '../../domain/services/token.service.js';
import type { IUserRepository } from '../../../users/domain/repositories/user.repository.js';

@Injectable()
export class LoginUseCase {
  constructor(
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
  ) {}

  async execute(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.userRepository.findByEmail(dto.email);

    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    if (!user.isActive || user.deleted) {
      throw new UnauthorizedException('La cuenta está desactivada o eliminada');
    }

    const isPasswordValid = await this.passwordService.compare(
      dto.password,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales inválidas');
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
