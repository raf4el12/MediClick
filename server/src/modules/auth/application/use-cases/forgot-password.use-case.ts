import { Injectable, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'crypto';
import { ForgotPasswordDto } from '../dto/forgot-password.dto.js';
import { RedisService } from '../../../../shared/redis/redis.service.js';
import { MailService } from '../../../../shared/mail/mail.service.js';
import type { IUserRepository } from '../../../users/domain/repositories/user.repository.js';

@Injectable()
export class ForgotPasswordUseCase {
  private readonly logger = new Logger(ForgotPasswordUseCase.name);
  private readonly clientUrl: string;
  private readonly TOKEN_TTL = 900; // 15 minutos

  constructor(
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
    private readonly redisService: RedisService,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
  ) {
    this.clientUrl = this.configService.get<string>(
      'CLIENT_URL',
      'http://localhost:3000',
    );
  }

  async execute(dto: ForgotPasswordDto): Promise<void> {
    const user = await this.userRepository.findByEmail(dto.email);

    // Siempre retornar sin error (no revelar si el email existe)
    if (!user || !user.isActive || user.deleted) {
      this.logger.log(
        `Forgot password solicitado para email inexistente/inactivo: ${dto.email}`,
      );
      return;
    }

    // Generar token plano y su hash
    const rawToken = randomBytes(32).toString('hex');
    const hashedToken = createHash('sha256').update(rawToken).digest('hex');

    // Guardar en Redis con TTL
    const redisKey = `password-reset:${hashedToken}`;
    const redisValue = JSON.stringify({
      email: user.email,
      userId: user.id,
    });
    await this.redisService.set(redisKey, redisValue, this.TOKEN_TTL);

    // Enviar email con el token plano
    const resetLink = `${this.clientUrl}/reset-password?token=${rawToken}`;
    await this.mailService.send({
      to: user.email,
      subject: 'Restablecer tu contraseña - MediClick',
      template: 'password-reset',
      context: {
        userName: user.name,
        resetLink,
        expirationMinutes: 15,
        year: new Date().getFullYear(),
      },
    });

    this.logger.log(`Token de reset generado para userId=${user.id}`);
  }
}
