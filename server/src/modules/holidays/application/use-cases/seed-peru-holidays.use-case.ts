import { Injectable, Inject } from '@nestjs/common';
import { SeedHolidaysDto, SeedHolidaysResponseDto } from '../dto/seed-holidays.dto.js';
import type { IHolidayRepository } from '../../domain/repositories/holiday.repository.js';
import { CreateHolidayData } from '../../domain/interfaces/holiday-data.interface.js';

@Injectable()
export class SeedPeruHolidaysUseCase {
  constructor(
    @Inject('IHolidayRepository')
    private readonly holidayRepository: IHolidayRepository,
  ) {}

  async execute(dto: SeedHolidaysDto): Promise<SeedHolidaysResponseDto> {
    const { year } = dto;

    // Calcular la fecha de Pascua para obtener Jueves y Viernes Santo
    const easter = this.calculateEasterDate(year);

    // Jueves Santo: 3 días antes del Domingo de Pascua
    const holyThursday = new Date(easter);
    holyThursday.setDate(easter.getDate() - 3);

    // Viernes Santo: 2 días antes del Domingo de Pascua
    const goodFriday = new Date(easter);
    goodFriday.setDate(easter.getDate() - 2);

    // Lista de feriados nacionales del Perú
    const holidays: CreateHolidayData[] = [
      {
        name: 'Año Nuevo',
        date: new Date(year, 0, 1),
        year,
        isRecurring: true,
      },
      {
        name: 'Jueves Santo',
        date: holyThursday,
        year,
        isRecurring: false,
      },
      {
        name: 'Viernes Santo',
        date: goodFriday,
        year,
        isRecurring: false,
      },
      {
        name: 'Día del Trabajo',
        date: new Date(year, 4, 1),
        year,
        isRecurring: true,
      },
      {
        name: 'Día de la Bandera',
        date: new Date(year, 5, 7),
        year,
        isRecurring: true,
      },
      {
        name: 'Fiestas Patrias',
        date: new Date(year, 6, 28),
        year,
        isRecurring: true,
      },
      {
        name: 'Fiestas Patrias',
        date: new Date(year, 6, 29),
        year,
        isRecurring: true,
      },
      {
        name: 'Santa Rosa de Lima',
        date: new Date(year, 7, 30),
        year,
        isRecurring: true,
      },
      {
        name: 'Combate de Angamos',
        date: new Date(year, 9, 8),
        year,
        isRecurring: true,
      },
      {
        name: 'Día de Todos los Santos',
        date: new Date(year, 10, 1),
        year,
        isRecurring: true,
      },
      {
        name: 'Inmaculada Concepción',
        date: new Date(year, 11, 8),
        year,
        isRecurring: true,
      },
      {
        name: 'Navidad',
        date: new Date(year, 11, 25),
        year,
        isRecurring: true,
      },
    ];

    // Eliminar feriados existentes para el año antes de insertar
    await this.holidayRepository.deleteByYear(year);

    // Insertar todos los feriados en bloque
    const seeded = await this.holidayRepository.createMany(holidays);

    return {
      seeded,
      year,
      message: `Se sembraron ${seeded} feriados para el año ${year}`,
    };
  }

  /**
   * Calcula la fecha de Pascua usando el algoritmo gregoriano anónimo (algoritmo de Meeus).
   */
  private calculateEasterDate(year: number): Date {
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(year, month - 1, day);
  }
}
