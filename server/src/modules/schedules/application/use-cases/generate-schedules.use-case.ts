import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { GenerateSchedulesDto } from '../dto/generate-schedules.dto.js';
import { GenerateSchedulesResponseDto } from '../dto/generate-schedules-response.dto.js';
import type { IScheduleRepository } from '../../domain/repositories/schedule.repository.js';
import type { IAvailabilityRepository } from '../../../availability/domain/repositories/availability.repository.js';
import type { IDoctorRepository } from '../../../doctors/domain/repositories/doctor.repository.js';
import type { CreateScheduleData } from '../../domain/interfaces/schedule-data.interface.js';
import { DayOfWeek } from '../../../../shared/domain/enums/day-of-week.enum.js';

const JS_DAY_TO_ENUM: Record<number, DayOfWeek> = {
  0: DayOfWeek.SUNDAY,
  1: DayOfWeek.MONDAY,
  2: DayOfWeek.TUESDAY,
  3: DayOfWeek.WEDNESDAY,
  4: DayOfWeek.THURSDAY,
  5: DayOfWeek.FRIDAY,
  6: DayOfWeek.SATURDAY,
};

@Injectable()
export class GenerateSchedulesUseCase {
  constructor(
    @Inject('IScheduleRepository')
    private readonly scheduleRepository: IScheduleRepository,
    @Inject('IAvailabilityRepository')
    private readonly availabilityRepository: IAvailabilityRepository,
    @Inject('IDoctorRepository')
    private readonly doctorRepository: IDoctorRepository,
  ) {}

  async execute(dto: GenerateSchedulesDto): Promise<GenerateSchedulesResponseDto> {
    if (dto.month < 1 || dto.month > 12) {
      throw new BadRequestException('El mes debe estar entre 1 y 12');
    }
    if (dto.year < 2020 || dto.year > 2100) {
      throw new BadRequestException('El año debe estar entre 2020 y 2100');
    }

    // Determinar doctores a procesar
    let doctorIds: number[];
    if (dto.doctorId) {
      const doctor = await this.doctorRepository.findById(dto.doctorId);
      if (!doctor) {
        throw new BadRequestException('El doctor especificado no existe');
      }
      doctorIds = [dto.doctorId];
    } else {
      // Obtener todos los doctores con disponibilidad activa
      const allAvailabilities = await this.availabilityRepository.findActiveByDoctorIds([]);
      doctorIds = [...new Set(allAvailabilities.map((a) => a.doctorId))];
    }

    if (doctorIds.length === 0) {
      return { generated: 0, skipped: 0, message: 'No hay doctores con disponibilidad activa' };
    }

    // Obtener días del mes
    const daysInMonth = new Date(dto.year, dto.month, 0).getDate();
    const dates: Date[] = [];
    for (let day = 1; day <= daysInMonth; day++) {
      dates.push(new Date(dto.year, dto.month - 1, day));
    }

    let totalGenerated = 0;
    let totalSkipped = 0;

    for (const doctorId of doctorIds) {
      // Obtener todas las availability rules del doctor
      const availabilities = await this.availabilityRepository.findActiveByDoctorIds([doctorId]);
      if (availabilities.length === 0) continue;

      // Obtener schedules existentes para evitar duplicados
      const existingSchedules = await this.scheduleRepository.findExistingDates(
        doctorId,
        dates,
      );

      const existingSet = new Set(
        existingSchedules.map(
          (s) =>
            `${s.scheduleDate.toISOString().split('T')[0]}_${s.timeFrom.getTime()}_${s.timeTo.getTime()}`,
        ),
      );

      const schedulesToCreate: CreateScheduleData[] = [];

      for (const date of dates) {
        const jsDayOfWeek = date.getDay();
        const dayOfWeek = JS_DAY_TO_ENUM[jsDayOfWeek];

        // Verificar vigencia y día de semana
        const matchingRules = availabilities.filter((a) => {
          if (a.dayOfWeek !== dayOfWeek) return false;
          if (!a.isAvailable) return false;
          // Verificar que la fecha está dentro del rango de vigencia
          const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
          const startOnly = new Date(a.startDate.getFullYear(), a.startDate.getMonth(), a.startDate.getDate());
          const endOnly = new Date(a.endDate.getFullYear(), a.endDate.getMonth(), a.endDate.getDate());
          return dateOnly >= startOnly && dateOnly <= endOnly;
        });

        for (const rule of matchingRules) {
          const key = `${date.toISOString().split('T')[0]}_${rule.timeFrom.getTime()}_${rule.timeTo.getTime()}`;

          if (existingSet.has(key)) {
            totalSkipped++;
            continue;
          }

          existingSet.add(key);
          schedulesToCreate.push({
            doctorId,
            specialtyId: rule.specialtyId,
            scheduleDate: date,
            timeFrom: rule.timeFrom,
            timeTo: rule.timeTo,
          });
        }
      }

      if (schedulesToCreate.length > 0) {
        const created = await this.scheduleRepository.createMany(schedulesToCreate);
        totalGenerated += created;
      }
    }

    return {
      generated: totalGenerated,
      skipped: totalSkipped,
      message: `Generación completada: ${totalGenerated} creados, ${totalSkipped} omitidos`,
    };
  }
}
