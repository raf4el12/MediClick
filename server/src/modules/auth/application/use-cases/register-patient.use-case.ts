import { Injectable, Inject, ConflictException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { RegisterPatientDto } from '../dto/register-patient.dto.js';
import { AuthResponseDto } from '../dto/auth-response.dto.js';
import { PrismaService } from '../../../../prisma/prisma.service.js';
import type { IPatientRepository } from '../../../patients/domain/repositories/patient.repository.js';
import type { IUserRepository } from '../../../users/domain/repositories/user.repository.js';
import type { IPasswordService } from '../../../../shared/domain/contracts/password-service.interface.js';
import type { ITokenService } from '../../domain/contracts/token-service.interface.js';
import type { IRefreshTokenRepository } from '../../domain/contracts/refresh-token-repository.interface.js';

@Injectable()
export class RegisterPatientUseCase {
  constructor(
    @Inject('IPatientRepository')
    private readonly patientRepository: IPatientRepository,
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
    @Inject('IPasswordService')
    private readonly passwordService: IPasswordService,
    @Inject('ITokenService')
    private readonly tokenService: ITokenService,
    @Inject('IRefreshTokenRepository')
    private readonly refreshTokenRepository: IRefreshTokenRepository,
    private readonly prisma: PrismaService,
  ) {}

  async execute(
    dto: RegisterPatientDto,
    deviceId: string,
  ): Promise<AuthResponseDto> {
    const emailExists = await this.patientRepository.existsByEmail(dto.email);
    if (emailExists) {
      throw new ConflictException('El email ya está registrado');
    }

    const dniExists = await this.patientRepository.existsByDni(
      dto.typeDocument,
      dto.numberDocument,
    );
    if (dniExists) {
      throw new ConflictException(
        'El documento de identidad ya está registrado',
      );
    }

    const hashedPassword = await this.passwordService.hash(dto.password);

    const patient = await this.patientRepository.create({
      user: {
        name: dto.name,
        email: dto.email,
        password: hashedPassword,
      },
      profile: {
        name: dto.name,
        lastName: dto.lastName,
        email: dto.email,
        phone: dto.phone,
        birthday: dto.birthday ? new Date(dto.birthday) : undefined,
        gender: dto.gender,
        typeDocument: dto.typeDocument,
        numberDocument: dto.numberDocument,
      },
      patient: {
        emergencyContact: dto.emergencyContact,
        bloodType: dto.bloodType,
        allergies: dto.allergies,
        chronicConditions: dto.chronicConditions,
      },
    });

    const userId = patient.profile.userId!;
    const user = await this.userRepository.findById(userId);

    const accessToken = await this.tokenService.generateAccessToken({
      sub: userId,
      email: dto.email,
      roleId: user!.roleId!,
      roleName: user!.roleName!,
      clinicId: null,
    });

    const rawRefreshToken = this.tokenService.generateOpaqueRefreshToken();
    const tokenHash = this.tokenService.hashToken(rawRefreshToken);
    const tokenFamily = randomUUID();
    const ttl = this.tokenService.getRefreshTokenTtlSeconds();

    await this.refreshTokenRepository.save(
      {
        tokenHash,
        tokenFamily,
        userId,
        deviceId,
        createdAt: Date.now(),
      },
      ttl,
    );

    const rolePermissions = user!.roleId
      ? await this.prisma.rolePermissions.findMany({
          where: { roleId: user!.roleId },
          include: { permission: { select: { action: true, subject: true } } },
        })
      : [];
    const permissions = rolePermissions.map(
      (rp) => `${rp.permission.action}:${rp.permission.subject}`,
    );

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      user: {
        id: userId,
        name: dto.name,
        email: dto.email,
        role: user!.roleName!,
        permissions,
      },
    };
  }
}
