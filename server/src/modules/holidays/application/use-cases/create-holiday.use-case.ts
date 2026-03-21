import { Injectable, Inject, ForbiddenException } from '@nestjs/common';
import { CreateHolidayDto } from '../dto/create-holiday.dto.js';
import { HolidayResponseDto } from '../dto/holiday-response.dto.js';
import type { IHolidayRepository } from '../../domain/repositories/holiday.repository.js';

@Injectable()
export class CreateHolidayUseCase {
  constructor(
    @Inject('IHolidayRepository')
    private readonly holidayRepository: IHolidayRepository,
  ) {}

  async execute(
    dto: CreateHolidayDto,
    jwtClinicId?: number | null,
  ): Promise<HolidayResponseDto> {
    // JWT clinicId prevails for staff; super-admin uses dto value
    const effectiveClinicId = jwtClinicId ?? dto.clinicId ?? undefined;

    // Staff cannot create holidays for another clinic
    if (jwtClinicId && dto.clinicId && dto.clinicId !== jwtClinicId) {
      throw new ForbiddenException('No puede crear feriados para otra sede');
    }

    const datePart = dto.date.split('T')[0];
    const parsedDate = new Date(`${datePart}T12:00:00Z`);
    const year = parsedDate.getUTCFullYear();
    const month = parsedDate.getUTCMonth();
    const day = parsedDate.getUTCDate();

    const holiday = await this.holidayRepository.create({
      name: dto.name,
      date: parsedDate,
      year,
      isRecurring: dto.isRecurring ?? false,
      clinicId: effectiveClinicId,
    });

    // Si es recurrente, propagar a todos los años que ya tienen feriados sembrados
    if (dto.isRecurring) {
      const existingYears = await this.holidayRepository.findDistinctYears();
      const otherYears = existingYears.filter((y) => y !== year);

      if (otherYears.length > 0) {
        const copies = otherYears.map((y) => ({
          name: dto.name,
          date: new Date(Date.UTC(y, month, day, 12, 0, 0)),
          year: y,
          isRecurring: true,
          clinicId: effectiveClinicId,
        }));
        await this.holidayRepository.createMany(copies);
      }
    }

    return {
      id: holiday.id,
      name: holiday.name,
      date: holiday.date,
      year: holiday.year,
      isRecurring: holiday.isRecurring,
      isActive: holiday.isActive,
      clinicId: holiday.clinicId,
      createdAt: holiday.createdAt,
    };
  }
}
