import {
  Injectable,
  Inject,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { ChangePasswordDto } from '../dto/change-password.dto.js';
import type { IPasswordService } from '../../../../shared/domain/contracts/password-service.interface.js';
import type { IUserRepository } from '../../../users/domain/repositories/user.repository.js';
import type { IRefreshTokenRepository } from '../../domain/contracts/refresh-token-repository.interface.js';

@Injectable()
export class ChangePasswordUseCase {
  private readonly logger = new Logger(ChangePasswordUseCase.name);

  constructor(
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
    @Inject('IPasswordService')
    private readonly passwordService: IPasswordService,
    @Inject('IRefreshTokenRepository')
    private readonly refreshTokenRepository: IRefreshTokenRepository,
  ) {}

  async execute(
    userId: number,
    dto: ChangePasswordDto,
    currentDeviceId: string,
  ): Promise<void> {
    const user = await this.userRepository.findById(userId);

    if (!user || !user.isActive || user.deleted) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const isCurrentValid = await this.passwordService.compare(
      dto.currentPassword,
      user.password,
    );

    if (!isCurrentValid) {
      throw new BadRequestException('La contraseña actual es incorrecta');
    }

    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException(
        'La nueva contraseña debe ser diferente a la actual',
      );
    }

    const hashedPassword = await this.passwordService.hash(dto.newPassword);
    await this.userRepository.updatePassword(user.id, hashedPassword);

    // Revoke all sessions except the current device
    await this.refreshTokenRepository.deleteAllByUser(user.id);

    this.logger.log(
      `Contraseña cambiada para userId=${user.id}. Otras sesiones cerradas.`,
    );
  }
}
