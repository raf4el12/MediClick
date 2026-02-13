import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import type { IUserRepository } from '../../domain/repositories/user.repository.js';

@Injectable()
export class DeleteUserUseCase {
  constructor(
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(id: number): Promise<void> {
    const existing = await this.userRepository.findByIdWithProfile(id);
    if (!existing) {
      throw new NotFoundException('Usuario no encontrado');
    }

    await this.userRepository.softDelete(id);
  }
}
