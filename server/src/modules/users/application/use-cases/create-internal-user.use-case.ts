import {
  Injectable,
  Inject,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { UserRole } from '../../../../shared/domain/enums/user-role.enum.js';
import { CreateInternalUserDto } from '../dto/create-internal-user.dto.js';
import { UserResponseDto } from '../dto/user-response.dto.js';
import type { IUserRepository } from '../../domain/repositories/user.repository.js';
import type { IPasswordService } from '../../../../shared/domain/contracts/password-service.interface.js';

const ALLOWED_INTERNAL_ROLES: UserRole[] = [
  UserRole.ADMIN,
  UserRole.DOCTOR,
  UserRole.RECEPTIONIST,
];

@Injectable()
export class CreateInternalUserUseCase {
  constructor(
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
    @Inject('IPasswordService')
    private readonly passwordService: IPasswordService,
  ) {}

  async execute(dto: CreateInternalUserDto): Promise<UserResponseDto> {
    if (!ALLOWED_INTERNAL_ROLES.includes(dto.role)) {
      throw new BadRequestException(
        'No se permite crear usuarios con rol PATIENT por este endpoint',
      );
    }

    const emailExists = await this.userRepository.existsByEmail(dto.email);
    if (emailExists) {
      throw new ConflictException('El email ya está registrado');
    }

    if (dto.profile.typeDocument && dto.profile.numberDocument) {
      const dniExists = await this.userRepository.existsByDni(
        dto.profile.typeDocument,
        dto.profile.numberDocument,
      );
      if (dniExists) {
        throw new ConflictException(
          'El documento de identidad ya está registrado',
        );
      }
    }

    const hashedPassword = await this.passwordService.hash(dto.password);

    const user = await this.userRepository.createInternalUser({
      name: dto.name,
      email: dto.email,
      password: hashedPassword,
      role: dto.role,
      profile: dto.profile,
    });

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
    };
  }
}
