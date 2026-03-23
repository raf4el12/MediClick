import { Injectable, Inject, Logger } from '@nestjs/common';
import { randomInt } from 'crypto';
import { ForgotPasswordDto } from '../dto/forgot-password.dto.js';
import { RedisService } from '../../../../shared/redis/redis.service.js';
import { MailService } from '../../../../shared/mail/mail.service.js';
import type { IUserRepository } from '../../../users/domain/repositories/user.repository.js';

@Injectable()
export class ForgotPasswordUseCase {
  private readonly logger = new Logger(ForgotPasswordUseCase.name);
  private readonly CODE_TTL = 600; // 10 minutos

  constructor(
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
    private readonly redisService: RedisService,
    private readonly mailService: MailService,
  ) {}

  async execute(dto: ForgotPasswordDto): Promise<void> {
    const user = await this.userRepository.findByEmail(dto.email);

    // Siempre retornar sin error (no revelar si el email existe)
    if (!user || !user.isActive || user.deleted) {
      this.logger.log(
        `Forgot password solicitado para email inexistente/inactivo: ${dto.email}`,
      );
      return;
    }

    // Generar código de 6 dígitos
    const code = String(randomInt(100000, 999999));

    // Guardar en Redis con TTL (clave por email para evitar múltiples códigos)
    const redisKey = `password-reset-code:${user.email}`;
    const redisValue = JSON.stringify({
      code,
      userId: user.id,
      attempts: 0,
    });
    await this.redisService.set(redisKey, redisValue, this.CODE_TTL);

    // Enviar email con el código
    await this.mailService.send({
      to: user.email,
      subject: 'Código de verificación - MediClick',
      template: 'password-reset',
      context: {
        userName: user.name,
        code,
        expirationMinutes: 10,
        year: new Date().getFullYear(),
      },
    });

    this.logger.log(`Código de reset generado para userId=${user.id}`);
  }
}
