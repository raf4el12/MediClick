import { ConflictException } from '@nestjs/common';
import { RegisterPatientUseCase } from './register-patient.use-case.js';
import type { IPatientRepository } from '../../../patients/domain/repositories/patient.repository.js';
import type { IUserRepository } from '../../../users/domain/repositories/user.repository.js';
import type { IPasswordService } from '../../../../shared/domain/contracts/password-service.interface.js';
import type { ITokenService } from '../../domain/contracts/token-service.interface.js';
import type { IRefreshTokenRepository } from '../../domain/contracts/refresh-token-repository.interface.js';

describe('RegisterPatientUseCase — TDD', () => {
  let useCase: RegisterPatientUseCase;
  let patientRepository: jest.Mocked<
    Pick<IPatientRepository, 'existsByEmail' | 'existsByDni' | 'create'>
  >;
  let userRepository: jest.Mocked<Pick<IUserRepository, 'findById'>>;
  let passwordService: jest.Mocked<IPasswordService>;
  let tokenService: jest.Mocked<ITokenService>;
  let refreshTokenRepository: jest.Mocked<IRefreshTokenRepository>;
  let prisma: any;

  const dto = {
    name: 'Ana',
    lastName: 'Gómez',
    email: 'ana@example.com',
    password: 'SecurePass123!',
    phone: '+51987654321',
    birthday: '1990-01-15',
    gender: 'F' as const,
    typeDocument: 'DNI' as const,
    numberDocument: '12345678',
    emergencyContact: '+51999000111',
    bloodType: 'O+',
  };

  const buildPatient = () => ({
    id: 10,
    profile: { userId: 42, name: 'Ana', lastName: 'Gómez' },
  });

  const buildUser = () => ({
    id: 42,
    name: 'Ana',
    email: 'ana@example.com',
    password: 'hashed_password',
    photo: null,
    roleId: 4,
    roleName: 'PATIENT',
    isActive: true,
    validateEmail: true,
    clinicId: null,
    clinicName: null,
    clinicTimezone: null,
    deleted: false,
    createdAt: new Date(),
    updatedAt: null,
  });

  beforeEach(() => {
    patientRepository = {
      existsByEmail: jest.fn().mockResolvedValue(false),
      existsByDni: jest.fn().mockResolvedValue(false),
      create: jest.fn().mockResolvedValue(buildPatient()),
    };

    userRepository = {
      findById: jest.fn().mockResolvedValue(buildUser()),
    };

    passwordService = {
      hash: jest.fn().mockResolvedValue('hashed_password'),
      compare: jest.fn(),
    };

    tokenService = {
      generateAccessToken: jest.fn().mockResolvedValue('access-token'),
      generateOpaqueRefreshToken: jest.fn().mockReturnValue('raw-refresh'),
      hashToken: jest.fn().mockReturnValue('hashed-refresh'),
      getRefreshTokenTtlSeconds: jest.fn().mockReturnValue(604800),
      verifyAccessToken: jest.fn(),
    };

    refreshTokenRepository = {
      save: jest.fn().mockResolvedValue(undefined),
      findByUserDevice: jest.fn(),
      findAllByUser: jest.fn(),
      deleteByUserDevice: jest.fn(),
      deleteAllByUser: jest.fn(),
    };

    prisma = {
      rolePermissions: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };

    useCase = new RegisterPatientUseCase(
      patientRepository as any,
      userRepository as any,
      passwordService,
      tokenService,
      refreshTokenRepository,
      prisma,
    );
  });

  // ── Iteración TDD 1: Registro exitoso ──────────────────────────────────────

  it('RED→GREEN: retorna tokens y datos de usuario en registro exitoso', async () => {
    const result = await useCase.execute(dto, 'device-1');

    expect(result.accessToken).toBe('access-token');
    expect(result.refreshToken).toBe('raw-refresh');
    expect(result.user.email).toBe('ana@example.com');
    expect(result.user.role).toBe('PATIENT');
  });

  it('hashea la contraseña antes de persistir', async () => {
    await useCase.execute(dto, 'device-1');

    expect(passwordService.hash).toHaveBeenCalledWith('SecurePass123!');
    expect(patientRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        user: expect.objectContaining({ password: 'hashed_password' }),
      }),
    );
  });

  it('persiste el refresh token vinculado al dispositivo', async () => {
    await useCase.execute(dto, 'device-1');

    expect(refreshTokenRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 42, deviceId: 'device-1' }),
      604800,
    );
  });

  // ── Iteración TDD 2: Duplicados ────────────────────────────────────────────

  it('RED→GREEN: lanza ConflictException si el email ya está registrado', async () => {
    patientRepository.existsByEmail.mockResolvedValue(true);

    await expect(useCase.execute(dto, 'device-1')).rejects.toThrow(
      ConflictException,
    );
  });

  it('RED→GREEN: lanza ConflictException si el DNI ya está registrado', async () => {
    patientRepository.existsByDni.mockResolvedValue(true);

    await expect(useCase.execute(dto, 'device-1')).rejects.toThrow(
      ConflictException,
    );
  });

  it('no invoca create() si el email ya existe', async () => {
    patientRepository.existsByEmail.mockResolvedValue(true);

    await expect(useCase.execute(dto, 'device-1')).rejects.toThrow();
    expect(patientRepository.create).not.toHaveBeenCalled();
  });

  it('no invoca create() si el DNI ya existe', async () => {
    patientRepository.existsByDni.mockResolvedValue(true);

    await expect(useCase.execute(dto, 'device-1')).rejects.toThrow();
    expect(patientRepository.create).not.toHaveBeenCalled();
  });

  // ── Iteración TDD 3: Datos correctos al repositorio ───────────────────────

  it('verifica duplicado de DNI con el tipo y número de documento correctos', async () => {
    await useCase.execute(dto, 'device-1');

    expect(patientRepository.existsByDni).toHaveBeenCalledWith(
      'DNI',
      '12345678',
    );
  });

  it('no llama a passwordService.hash si el email ya existe', async () => {
    patientRepository.existsByEmail.mockResolvedValue(true);

    await expect(useCase.execute(dto, 'device-1')).rejects.toThrow();
    expect(passwordService.hash).not.toHaveBeenCalled();
  });
});
