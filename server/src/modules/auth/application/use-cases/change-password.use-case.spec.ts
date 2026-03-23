import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ChangePasswordUseCase } from './change-password.use-case';
import { UserRole } from '../../../../shared/domain/enums/user-role.enum';
import type { IUserRepository } from '../../../users/domain/repositories/user.repository';
import type { IPasswordService } from '../../../../shared/domain/contracts/password-service.interface';
import type { IRefreshTokenRepository } from '../../domain/contracts/refresh-token-repository.interface';
import { UserEntity } from '../../../users/domain/entities/user.entity';

describe('ChangePasswordUseCase', () => {
  let useCase: ChangePasswordUseCase;
  let userRepository: jest.Mocked<IUserRepository>;
  let passwordService: jest.Mocked<IPasswordService>;
  let refreshTokenRepository: jest.Mocked<IRefreshTokenRepository>;

  const mockUser: UserEntity = {
    id: 1,
    name: 'Test User',
    email: 'test@mediclick.com',
    password: 'hashed_old',
    photo: null,
    role: UserRole.DOCTOR,
    isActive: true,
    validateEmail: true,
    clinicId: 1,
    clinicName: 'MediClick Sede Lima',
    deleted: false,
    createdAt: new Date(),
    updatedAt: null,
  };

  beforeEach(() => {
    userRepository = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      existsByEmail: jest.fn(),
      existsByDni: jest.fn(),
      createInternalUser: jest.fn(),
      findAllPaginated: jest.fn(),
      findByIdWithProfile: jest.fn(),
      updateUser: jest.fn(),
      updatePassword: jest.fn(),
      softDelete: jest.fn(),
    };

    passwordService = {
      hash: jest.fn(),
      compare: jest.fn(),
    };

    refreshTokenRepository = {
      save: jest.fn(),
      findByUserDevice: jest.fn(),
      findAllByUser: jest.fn(),
      deleteByUserDevice: jest.fn(),
      deleteAllByUser: jest.fn(),
    };

    useCase = new ChangePasswordUseCase(
      userRepository,
      passwordService,
      refreshTokenRepository,
    );
  });

  it('should change password and revoke all sessions', async () => {
    userRepository.findById.mockResolvedValue(mockUser);
    passwordService.compare.mockResolvedValue(true);
    passwordService.hash.mockResolvedValue('hashed_new');
    userRepository.updatePassword.mockResolvedValue();
    refreshTokenRepository.deleteAllByUser.mockResolvedValue();

    await useCase.execute(
      1,
      { currentPassword: 'oldPass', newPassword: 'newPass123' },
      'device-1',
    );

    expect(userRepository.updatePassword).toHaveBeenCalledWith(1, 'hashed_new');
    expect(refreshTokenRepository.deleteAllByUser).toHaveBeenCalledWith(1);
  });

  it('should throw NotFoundException if user not found', async () => {
    userRepository.findById.mockResolvedValue(null);

    await expect(
      useCase.execute(
        99,
        { currentPassword: 'old', newPassword: 'new12345' },
        'device-1',
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it('should throw BadRequestException if current password is wrong', async () => {
    userRepository.findById.mockResolvedValue(mockUser);
    passwordService.compare.mockResolvedValue(false);

    await expect(
      useCase.execute(
        1,
        { currentPassword: 'wrong', newPassword: 'new12345' },
        'device-1',
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('should throw BadRequestException if new password equals current', async () => {
    userRepository.findById.mockResolvedValue(mockUser);
    passwordService.compare.mockResolvedValue(true);

    await expect(
      useCase.execute(
        1,
        { currentPassword: 'samePass', newPassword: 'samePass' },
        'device-1',
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('should throw NotFoundException if user is inactive', async () => {
    userRepository.findById.mockResolvedValue({
      ...mockUser,
      isActive: false,
    });

    await expect(
      useCase.execute(
        1,
        { currentPassword: 'old', newPassword: 'new12345' },
        'device-1',
      ),
    ).rejects.toThrow(NotFoundException);
  });
});
