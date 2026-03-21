import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { UpdateClinicDto } from '../dto/update-clinic.dto.js';
import { ClinicResponseDto } from '../dto/clinic-response.dto.js';
import type { IClinicRepository } from '../../domain/repositories/clinic.repository.js';

@Injectable()
export class UpdateClinicUseCase {
  constructor(
    @Inject('IClinicRepository')
    private readonly clinicRepository: IClinicRepository,
  ) {}

  async execute(id: number, dto: UpdateClinicDto): Promise<ClinicResponseDto> {
    const clinic = await this.clinicRepository.findById(id);
    if (!clinic) {
      throw new NotFoundException('Sede no encontrada');
    }

    if (dto.timezone) {
      const validTimezones = Intl.supportedValuesOf('timeZone');
      if (!validTimezones.includes(dto.timezone)) {
        throw new BadRequestException(`Zona horaria inválida: ${dto.timezone}`);
      }
    }

    if (dto.name) {
      const exists = await this.clinicRepository.existsByNameExcluding(
        dto.name,
        id,
      );
      if (exists) {
        throw new ConflictException('Ya existe una sede con ese nombre');
      }
    }

    const updated = await this.clinicRepository.update(id, dto);

    return {
      id: updated.id,
      name: updated.name,
      address: updated.address,
      phone: updated.phone,
      email: updated.email,
      timezone: updated.timezone,
      currency: updated.currency,
      isActive: updated.isActive,
      createdAt: updated.createdAt,
    };
  }
}
