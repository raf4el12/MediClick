import {
  Injectable,
  Inject,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { OnboardDoctorDto } from '../dto/onboard-doctor.dto.js';
import { DoctorResponseDto } from '../dto/doctor-response.dto.js';
import type { IDoctorRepository } from '../../domain/repositories/doctor.repository.js';
import type { ISpecialtyRepository } from '../../../specialties/domain/repositories/specialty.repository.js';
import type { IPasswordService } from '../../../../shared/domain/contracts/password-service.interface.js';

@Injectable()
export class OnboardDoctorUseCase {
  constructor(
    @Inject('IDoctorRepository')
    private readonly doctorRepository: IDoctorRepository,
    @Inject('ISpecialtyRepository')
    private readonly specialtyRepository: ISpecialtyRepository,
    @Inject('IPasswordService')
    private readonly passwordService: IPasswordService,
  ) {}

  async execute(dto: OnboardDoctorDto): Promise<DoctorResponseDto> {
    const emailExists = await this.doctorRepository.existsByEmail(
      dto.user.email,
    );
    if (emailExists) {
      throw new ConflictException('El email ya está registrado');
    }

    const cmpExists = await this.doctorRepository.existsByLicenseNumber(
      dto.cmp,
    );
    if (cmpExists) {
      throw new ConflictException(
        'El número de colegiatura (CMP) ya está registrado',
      );
    }

    const foundSpecialties = await this.specialtyRepository.findByIds(
      dto.specialtyIds,
    );
    if (foundSpecialties.length !== dto.specialtyIds.length) {
      const foundIds = new Set(foundSpecialties.map((s) => s.id));
      const missing = dto.specialtyIds.filter((id) => !foundIds.has(id));
      throw new BadRequestException(
        `Las siguientes especialidades no existen: ${missing.join(', ')}`,
      );
    }

    const hashedPassword = await this.passwordService.hash(dto.user.password);

    const doctor = await this.doctorRepository.onboard({
      user: {
        name: dto.user.name,
        email: dto.user.email,
        password: hashedPassword,
      },
      profile: {
        name: dto.profile.name,
        lastName: dto.profile.lastName,
        email: dto.user.email,
        phone: dto.profile.phone,
        gender: dto.profile.gender,
      },
      doctor: {
        licenseNumber: dto.cmp,
        resume: dto.resume,
      },
      specialtyIds: dto.specialtyIds,
    });

    return {
      id: doctor.id,
      licenseNumber: doctor.licenseNumber,
      resume: doctor.resume,
      isActive: doctor.isActive,
      createdAt: doctor.createdAt,
      profile: {
        id: doctor.profile.id,
        name: doctor.profile.name,
        lastName: doctor.profile.lastName,
        email: doctor.profile.email,
        phone: doctor.profile.phone,
        gender: doctor.profile.gender,
      },
      user: doctor.profile.user,
      specialties: doctor.specialties.map((ds) => ds.specialty),
    };
  }
}
