import { UnauthorizedException } from '@nestjs/common';
import { LoginUseCase } from './login.use-case.js';
import { UserRole } from '../../../../shared/domain/enums/user-role.enum.js';
import type { IUserRepository } from '../../../users/domain/repositories/user.repository.js';
import type { IPasswordService } from '../../../../shared/domain/contracts/password-service.interface.js';
import type { ITokenService } from '../../domain/contracts/token-service.interface.js';
import type { IRefreshTokenRepository } from '../../domain/contracts/refresh-token-repository.interface.js';
import { UserEntity } from '../../../users/domain/entities/user.entity.js';

describe('LoginUseCase', () => {
  let useCase: LoginUseCase;
  let userRepository: jest.Mocked<IUserRepository>;
  let passwordService: jest.Mocked<IPasswordService>;
  let tokenService: jest.Mocked<ITokenService>;
  let refreshTokenRepository: jest.Mocked<IRefreshTokenRepository>;

  const mockUser: UserEntity = {
    id: 1,
    name: 'Test User',
    email: 'test@mediclick.com',
    password: 'hashed_password',
    photo: null,
    role: UserRole.DOCTOR,
    isActive: true,
    validateEmail: true,
    clinicId: 1,
    clinicName: 'MediClick Sede Lima',
    clinicTimezone: 'America/Lima',
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

    tokenService = {
      generateAccessToken: jest.fn(),
      generateOpaqueRefreshToken: jest.fn(),
      hashToken: jest.fn(),
      verifyAccessToken: jest.fn(),
      getRefreshTokenTtlSeconds: jest.fn(),
    };

    refreshTokenRepository = {
      save: jest.fn(),
      findByUserDevice: jest.fn(),
      findAllByUser: jest.fn(),
      deleteByUserDevice: jest.fn(),
      deleteAllByUser: jest.fn(),
    };

    useCase = new LoginUseCase(
      userRepository,
      passwordService,
      tokenService,
      refreshTokenRepository,
    );
  });

  it('should return tokens and user data on valid credentials', async () => {
    userRepository.findByEmail.mockResolvedValue(mockUser);
    passwordService.compare.mockResolvedValue(true);
    tokenService.generateOpaqueRefreshToken.mockReturnValue('raw-refresh');
    tokenService.hashToken.mockReturnValue('hashed-refresh');
    tokenService.getRefreshTokenTtlSeconds.mockReturnValue(604800);
    tokenService.generateAccessToken.mockResolvedValue('access-token');
    refreshTokenRepository.save.mockResolvedValue();

    const result = await useCase.execute(
      { email: 'test@mediclick.com', password: '123456', deviceId: 'device-1' },
      'device-1',
    );

    expect(result.accessToken).toBe('access-token');
    expect(result.refreshToken).toBe('raw-refresh');
    expect(result.user.id).toBe(1);
    expect(result.user.role).toBe(UserRole.DOCTOR);
    expect(refreshTokenRepository.save).toHaveBeenCalledTimes(1);
  });

  it('should throw UnauthorizedException if user not found', async () => {
    userRepository.findByEmail.mockResolvedValue(null);

    await expect(
      useCase.execute(
        {
          email: 'notfound@mediclick.com',
          password: '123456',
          deviceId: 'device-1',
        },
        'device-1',
      ),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException if password is wrong', async () => {
    userRepository.findByEmail.mockResolvedValue(mockUser);
    passwordService.compare.mockResolvedValue(false);

    await expect(
      useCase.execute(
        {
          email: 'test@mediclick.com',
          password: 'wrong',
          deviceId: 'device-1',
        },
        'device-1',
      ),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException if user is inactive', async () => {
    userRepository.findByEmail.mockResolvedValue({
      ...mockUser,
      isActive: false,
    });

    await expect(
      useCase.execute(
        {
          email: 'test@mediclick.com',
          password: '123456',
          deviceId: 'device-1',
        },
        'device-1',
      ),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException if user is deleted', async () => {
    userRepository.findByEmail.mockResolvedValue({
      ...mockUser,
      deleted: true,
    });

    await expect(
      useCase.execute(
        {
          email: 'test@mediclick.com',
          password: '123456',
          deviceId: 'device-1',
        },
        'device-1',
      ),
    ).rejects.toThrow(UnauthorizedException);
  });
});
