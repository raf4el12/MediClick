import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import type { IUserRepository } from '../../../users/domain/repositories/user.repository.js';
import type { UserWithProfile } from '../../../users/domain/interfaces/user-data.interface.js';
import type { UpdateUserData } from '../../../users/domain/interfaces/user-data.interface.js';
import { UpdateMyProfileDto } from '../dto/update-profile.dto.js';

@Injectable()
export class UpdateProfileUseCase {
  constructor(
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(
    userId: number,
    dto: UpdateMyProfileDto,
  ): Promise<UserWithProfile> {
    const user = await this.userRepository.findByIdWithProfile(userId);

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const data: UpdateUserData = {
      profile: {
        name: dto.name,
        lastName: dto.lastName,
        phone: dto.phone,
        typeDocument: dto.typeDocument,
        numberDocument: dto.numberDocument,
        address: dto.address,
        state: dto.state,
        country: dto.country,
      },
    };

    return this.userRepository.updateUser(userId, data);
  }
}
