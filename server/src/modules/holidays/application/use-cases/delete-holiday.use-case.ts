import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import type { IHolidayRepository } from '../../domain/repositories/holiday.repository.js';

@Injectable()
export class DeleteHolidayUseCase {
  constructor(
    @Inject('IHolidayRepository')
    private readonly holidayRepository: IHolidayRepository,
  ) {}

  async execute(id: number, clinicId?: number | null): Promise<void> {
    const existing = await this.holidayRepository.findById(id);
    if (!existing) {
      throw new NotFoundException('Feriado no encontrado');
    }

    // Clinic-scoped staff cannot delete global holidays (clinicId=null — owned by super-admin)
    if (clinicId && existing.clinicId !== clinicId) {
      throw new ForbiddenException('No tiene acceso a este feriado');
    }

    await this.holidayRepository.delete(id);
  }
}
