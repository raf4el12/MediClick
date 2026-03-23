import {
  Injectable,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { VerifyResetCodeDto } from '../dto/verify-reset-code.dto.js';
import { RedisService } from '../../../../shared/redis/redis.service.js';

interface CodePayload {
  code: string;
  userId: number;
  attempts: number;
}

@Injectable()
export class VerifyResetCodeUseCase {
  private readonly logger = new Logger(VerifyResetCodeUseCase.name);
  private readonly MAX_ATTEMPTS = 5;
  private readonly RESET_TOKEN_TTL = 600; // 10 minutos para completar el reset

  constructor(private readonly redisService: RedisService) {}

  async execute(dto: VerifyResetCodeDto): Promise<{ resetToken: string }> {
    const redisKey = `password-reset-code:${dto.email}`;
    const raw = await this.redisService.get(redisKey);

    if (!raw) {
      throw new BadRequestException('Código inválido o expirado');
    }

    let payload: CodePayload;
    try {
      payload = JSON.parse(raw) as CodePayload;
    } catch {
      await this.redisService.del(redisKey);
      throw new BadRequestException('Código inválido o expirado');
    }

    // Verificar intentos máximos
    if (payload.attempts >= this.MAX_ATTEMPTS) {
      await this.redisService.del(redisKey);
      throw new BadRequestException(
        'Demasiados intentos fallidos. Solicita un nuevo código.',
      );
    }

    // Verificar código
    if (payload.code !== dto.code) {
      payload.attempts++;
      const ttl = await this.redisService.ttl(redisKey);
      await this.redisService.set(
        redisKey,
        JSON.stringify(payload),
        ttl > 0 ? ttl : 1,
      );
      throw new BadRequestException('Código incorrecto');
    }

    // Código válido — eliminar de Redis
    await this.redisService.del(redisKey);

    // Generar token temporal para el paso de reset
    const rawToken = randomBytes(32).toString('hex');
    const hashedToken = createHash('sha256').update(rawToken).digest('hex');

    const resetKey = `password-reset:${hashedToken}`;
    const resetValue = JSON.stringify({
      email: dto.email,
      userId: payload.userId,
    });
    await this.redisService.set(resetKey, resetValue, this.RESET_TOKEN_TTL);

    this.logger.log(
      `Código verificado para ${dto.email}. Token de reset generado.`,
    );

    return { resetToken: rawToken };
  }
}
