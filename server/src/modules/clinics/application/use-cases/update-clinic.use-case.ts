import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { UpdateClinicDto } from '../dto/update-clinic.dto.js';
import { ClinicResponseDto } from '../dto/clinic-response.dto.js';
import type { IClinicRepository } from '../../domain/repositories/clinic.repository.js';
import { SystemRole } from '../../../../shared/domain/enums/permission.enum.js';

// Roles de plataforma (system) que administran cualquier sede. Los admins de
// clínica usan custom roles (no están en SystemRole) y solo gestionan la propia.
const CROSS_TENANT_ROLES = new Set<string>([
  SystemRole.SUPER_ADMIN,
  SystemRole.ADMIN,
]);

@Injectable()
export class UpdateClinicUseCase {
  constructor(
    @Inject('IClinicRepository')
    private readonly clinicRepository: IClinicRepository,
  ) {}

  async execute(
    id: number,
    dto: UpdateClinicDto,
    callerClinicId: number | null,
    callerRoleName: string,
  ): Promise<ClinicResponseDto> {
    const clinic = await this.clinicRepository.findById(id);
    if (!clinic) {
      throw new NotFoundException('Sede no encontrada');
    }

    // Defense-in-depth A01: un admin clínico-scopeado solo puede modificar su
    // propia sede; los roles de plataforma administran todas. La mutación no
    // lo verificaba y dependía de que solo MANAGE:ALL tuviera UPDATE:CLINICS.
    if (!CROSS_TENANT_ROLES.has(callerRoleName) && callerClinicId !== id) {
      throw new ForbiddenException('Solo puede modificar su propia sede');
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
