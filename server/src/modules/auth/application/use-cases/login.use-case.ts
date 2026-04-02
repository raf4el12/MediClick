import { Injectable, Inject, UnauthorizedException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { LoginDto } from '../dto/login.dto.js';
import { AuthResponseDto } from '../dto/auth-response.dto.js';
import { PrismaService } from '../../../../prisma/prisma.service.js';
import type { IPasswordService } from '../../../../shared/domain/contracts/password-service.interface.js';
import type { ITokenService } from '../../domain/contracts/token-service.interface.js';
import type { IRefreshTokenRepository } from '../../domain/contracts/refresh-token-repository.interface.js';
import type { IUserRepository } from '../../../users/domain/repositories/user.repository.js';

@Injectable()
export class LoginUseCase {
  constructor(
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
    @Inject('IPasswordService')
    private readonly passwordService: IPasswordService,
    @Inject('ITokenService')
    private readonly tokenService: ITokenService,
    @Inject('IRefreshTokenRepository')
    private readonly refreshTokenRepository: IRefreshTokenRepository,
    private readonly prisma: PrismaService,
  ) {}

  async execute(dto: LoginDto, deviceId: string): Promise<AuthResponseDto> {
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

    const rawRefreshToken = this.tokenService.generateOpaqueRefreshToken();
    const tokenHash = this.tokenService.hashToken(rawRefreshToken);
    const tokenFamily = randomUUID();
    const ttl = this.tokenService.getRefreshTokenTtlSeconds();

    const [accessToken] = await Promise.all([
      this.tokenService.generateAccessToken({
        sub: user.id,
        email: user.email,
        roleId: user.roleId!,
        roleName: user.roleName!,
        clinicId: user.clinicId,
      }),
      this.refreshTokenRepository.save(
        {
          tokenHash,
          tokenFamily,
          userId: user.id,
          deviceId,
          createdAt: Date.now(),
        },
        ttl,
      ),
    ]);

    const rolePermissions = user.roleId
      ? await this.prisma.rolePermissions.findMany({
          where: { roleId: user.roleId },
          include: { permission: { select: { action: true, subject: true } } },
        })
      : [];
    const permissions = rolePermissions.map(
      (rp) => `${rp.permission.action}:${rp.permission.subject}`,
    );

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.roleName!,
        permissions,
        clinicName: user.clinicName,
        clinicTimezone: user.clinicTimezone,
      },
    };
  }
}
