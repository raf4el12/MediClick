import {
  Injectable,
  Inject,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { CreateClinicDto } from '../dto/create-clinic.dto.js';
import { ClinicResponseDto } from '../dto/clinic-response.dto.js';
import type { IClinicRepository } from '../../domain/repositories/clinic.repository.js';

@Injectable()
export class CreateClinicUseCase {
  constructor(
    @Inject('IClinicRepository')
    private readonly clinicRepository: IClinicRepository,
  ) {}

  async execute(dto: CreateClinicDto): Promise<ClinicResponseDto> {
    // Validar timezone IANA
    const validTimezones = Intl.supportedValuesOf('timeZone');
    if (!validTimezones.includes(dto.timezone)) {
      throw new BadRequestException(`Zona horaria inválida: ${dto.timezone}`);
    }

    const exists = await this.clinicRepository.existsByName(dto.name);
    if (exists) {
      throw new ConflictException('Ya existe una sede con ese nombre');
    }

    const clinic = await this.clinicRepository.create({
      name: dto.name,
      address: dto.address,
      phone: dto.phone,
      email: dto.email,
      timezone: dto.timezone,
      currency: dto.currency,
    });

    return this.toResponse(clinic);
  }

  private toResponse(c: any): ClinicResponseDto {
    return {
      id: c.id,
      name: c.name,
      address: c.address,
      phone: c.phone,
      email: c.email,
      timezone: c.timezone,
      currency: c.currency,
      isActive: c.isActive,
      createdAt: c.createdAt,
    };
  }
}
