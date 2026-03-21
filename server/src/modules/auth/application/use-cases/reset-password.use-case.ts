import {
  Injectable,
  Inject,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { createHash } from 'crypto';
import { ResetPasswordDto } from '../dto/reset-password.dto.js';
import { RedisService } from '../../../../shared/redis/redis.service.js';
import type { IPasswordService } from '../../../../shared/domain/contracts/password-service.interface.js';
import type { IUserRepository } from '../../../users/domain/repositories/user.repository.js';
import type { IRefreshTokenRepository } from '../../domain/contracts/refresh-token-repository.interface.js';

interface PasswordResetPayload {
  email: string;
  userId: number;
}

@Injectable()
export class ResetPasswordUseCase {
  private readonly logger = new Logger(ResetPasswordUseCase.name);

  constructor(
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
    @Inject('IPasswordService')
    private readonly passwordService: IPasswordService,
    @Inject('IRefreshTokenRepository')
    private readonly refreshTokenRepository: IRefreshTokenRepository,
    private readonly redisService: RedisService,
  ) {}

  async execute(dto: ResetPasswordDto): Promise<void> {
    // Hashear el token recibido para buscar en Redis
    const hashedToken = createHash('sha256').update(dto.token).digest('hex');
    const redisKey = `password-reset:${hashedToken}`;

    // Buscar en Redis
    const raw = await this.redisService.get(redisKey);
    if (!raw) {
      throw new BadRequestException('Token inválido o expirado');
    }

    let payload: PasswordResetPayload;
    try {
      payload = JSON.parse(raw) as PasswordResetPayload;
    } catch {
      await this.redisService.del(redisKey);
      throw new BadRequestException('Token inválido o expirado');
    }

    // Verificar que el usuario aún existe y está activo
    const user = await this.userRepository.findByEmail(payload.email);
    if (!user || !user.isActive || user.deleted) {
      await this.redisService.del(redisKey);
      throw new BadRequestException('Token inválido o expirado');
    }

    // Hashear nueva contraseña y actualizar
    const hashedPassword = await this.passwordService.hash(dto.newPassword);
    await this.userRepository.updatePassword(user.id, hashedPassword);

    // Eliminar token de Redis (uso único)
    await this.redisService.del(redisKey);

    // Forzar re-login en todos los dispositivos
    await this.refreshTokenRepository.deleteAllByUser(user.id);

    this.logger.log(
      `Contraseña restablecida para userId=${user.id}. Sesiones cerradas.`,
    );
  }
}
