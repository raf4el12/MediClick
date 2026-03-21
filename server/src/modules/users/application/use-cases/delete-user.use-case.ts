import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import type { IUserRepository } from '../../domain/repositories/user.repository.js';

@Injectable()
export class DeleteUserUseCase {
  constructor(
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(id: number, clinicId?: number | null): Promise<void> {
    const existing = await this.userRepository.findByIdWithProfile(id);
    if (!existing) {
      throw new NotFoundException('Usuario no encontrado');
    }

    if (clinicId && existing.clinicId !== clinicId) {
      throw new ForbiddenException('No tiene acceso a este usuario');
    }

    await this.userRepository.softDelete(id);
  }
}
