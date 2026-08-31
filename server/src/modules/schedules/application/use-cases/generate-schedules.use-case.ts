import {
  Injectable,
  Inject,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { GenerateSchedulesDto } from '../dto/generate-schedules.dto.js';
import { GenerateSchedulesResponseDto } from '../dto/generate-schedules-response.dto.js';
import type { IScheduleRepository } from '../../domain/repositories/schedule.repository.js';
import type { IAvailabilityRepository } from '../../../availability/domain/repositories/availability.repository.js';
import type { IDoctorRepository } from '../../../doctors/domain/repositories/doctor.repository.js';
import type { ISpecialtyRepository } from '../../../specialties/domain/repositories/specialty.repository.js';
import type { IHolidayRepository } from '../../../holidays/domain/repositories/holiday.repository.js';
import type { IScheduleBlockRepository } from '../../../schedule-blocks/domain/repositories/schedule-block.repository.js';
import type { AvailabilityEntity } from '../../../availability/domain/entities/availability.entity.js';
import {
  ScheduleGenerationPlanner,
  type ScheduleSpecialtyConfig,
} from '../../domain/services/schedule-generation-planner.service.js';

@Injectable()
export class GenerateSchedulesUseCase {
  private readonly planner = new ScheduleGenerationPlanner();

  constructor(
    @Inject('IScheduleRepository')
    private readonly scheduleRepository: IScheduleRepository,
    @Inject('IAvailabilityRepository')
    private readonly availabilityRepository: IAvailabilityRepository,
    @Inject('IDoctorRepository')
    private readonly doctorRepository: IDoctorRepository,
    @Inject('ISpecialtyRepository')
    private readonly specialtyRepository: ISpecialtyRepository,
    @Inject('IHolidayRepository')
    private readonly holidayRepository: IHolidayRepository,
    @Inject('IScheduleBlockRepository')
    private readonly scheduleBlockRepository: IScheduleBlockRepository,
  ) {}

  async execute(
    dto: GenerateSchedulesDto,
    jwtClinicId?: number | null,
  ): Promise<GenerateSchedulesResponseDto> {
    const { rangeStart, rangeEnd, dates } = this.resolveDateRange(dto);
    const doctorClinicCache = new Map<number, number | null>();
    const specialtyCache = new Map<number, ScheduleSpecialtyConfig>();
    const doctorIds = await this.resolveDoctorIds(
      dto,
      jwtClinicId,
      doctorClinicCache,
    );

    if (doctorIds.length === 0) {
      return {
        generated: 0,
        skipped: 0,
        deleted: 0,
        message: 'No hay doctores con disponibilidad activa',
      };
    }

    const holidays = await this.holidayRepository.findByDateRange(
      rangeStart,
      rangeEnd,
    );
    let totalGenerated = 0;
    let totalSkipped = 0;
    let totalDeleted = 0;

    for (const doctorId of doctorIds) {
      const result = await this.processDoctor(
        doctorId,
        dto,
        dates,
        rangeStart,
        rangeEnd,
        holidays,
        doctorClinicCache,
        specialtyCache,
      );
      totalGenerated += result.generated;
      totalSkipped += result.skipped;
      totalDeleted += result.deleted;
    }

    const parts = [`${totalGenerated} creados`];
    if (totalSkipped > 0) parts.push(`${totalSkipped} omitidos`);
    if (totalDeleted > 0) parts.push(`${totalDeleted} eliminados`);
    return {
      generated: totalGenerated,
      skipped: totalSkipped,
      deleted: totalDeleted,
      message: `Generación completada: ${parts.join(', ')}`,
    };
  }

  private async resolveDoctorIds(
    dto: GenerateSchedulesDto,
    jwtClinicId: number | null | undefined,
    doctorClinicCache: Map<number, number | null>,
  ): Promise<number[]> {
    if (dto.doctorId) {
      const doctor = await this.doctorRepository.findById(dto.doctorId);
      if (!doctor) {
        throw new BadRequestException('El doctor especificado no existe');
      }
      if (jwtClinicId && doctor.clinicId !== jwtClinicId) {
        throw new ForbiddenException(
          'No puede generar horarios para un doctor de otra sede',
        );
      }
      doctorClinicCache.set(dto.doctorId, doctor.clinicId ?? null);
      return [dto.doctorId];
    }

    const allAvailabilities =
      await this.availabilityRepository.findActiveByDoctorIds([]);
    const visibleAvailabilities = jwtClinicId
      ? allAvailabilities.filter(
          (availability) => availability.clinicId === jwtClinicId,
        )
      : allAvailabilities;
    return [
      ...new Set(
        visibleAvailabilities.map((availability) => availability.doctorId),
      ),
    ];
  }

  private async processDoctor(
    doctorId: number,
    dto: GenerateSchedulesDto,
    dates: Date[],
    rangeStart: Date,
    rangeEnd: Date,
    holidays: Awaited<ReturnType<IHolidayRepository['findByDateRange']>>,
    doctorClinicCache: Map<number, number | null>,
    specialtyCache: Map<number, ScheduleSpecialtyConfig>,
  ): Promise<{ generated: number; skipped: number; deleted: number }> {
    let availabilities =
      await this.availabilityRepository.findActiveByDoctorIds([doctorId]);
    if (dto.specialtyId) {
      availabilities = availabilities.filter(
        (availability) => availability.specialtyId === dto.specialtyId,
      );
    }
    if (availabilities.length === 0) {
      return { generated: 0, skipped: 0, deleted: 0 };
    }

    const doctorClinicId = await this.resolveDoctorClinicId(
      doctorId,
      doctorClinicCache,
    );
    const deleted = dto.overwrite
      ? await this.scheduleRepository.deleteUnbookedByDoctorAndDateRange(
          doctorId,
          rangeStart,
          rangeEnd,
          dto.specialtyId,
        )
      : 0;
    const [scheduleBlocks, existingSchedules] = await Promise.all([
      this.scheduleBlockRepository.findActiveByDoctorAndDateRange(
        doctorId,
        rangeStart,
        rangeEnd,
      ),
      this.scheduleRepository.findExistingDates(doctorId, dates),
    ]);
    await this.populateSpecialties(availabilities, specialtyCache);

    const plan = this.planner.plan({
      doctorId,
      clinicId: doctorClinicId,
      dates,
      availabilities,
      holidays,
      scheduleBlocks,
      specialties: specialtyCache,
      existingSchedules,
    });
    const generated = plan.desired.length
      ? await this.scheduleRepository.createMany(plan.desired)
      : 0;

    return { generated, skipped: plan.skipped.length, deleted };
  }

  private async resolveDoctorClinicId(
    doctorId: number,
    doctorClinicCache: Map<number, number | null>,
  ): Promise<number | null> {
    if (!doctorClinicCache.has(doctorId)) {
      const doctor = await this.doctorRepository.findById(doctorId);
      doctorClinicCache.set(doctorId, doctor?.clinicId ?? null);
    }
    return doctorClinicCache.get(doctorId) ?? null;
  }

  private async populateSpecialties(
    availabilities: AvailabilityEntity[],
    specialtyCache: Map<number, ScheduleSpecialtyConfig>,
  ): Promise<void> {
    for (const specialtyId of new Set(
      availabilities.map((availability) => availability.specialtyId),
    )) {
      if (specialtyCache.has(specialtyId)) continue;
      const specialty = await this.specialtyRepository.findById(specialtyId);
      specialtyCache.set(specialtyId, {
        duration: specialty?.duration ?? null,
        bufferMinutes: specialty?.bufferMinutes ?? 0,
      });
    }
  }

  private resolveDateRange(dto: GenerateSchedulesDto): {
    rangeStart: Date;
    rangeEnd: Date;
    dates: Date[];
  } {
    if (dto.dateFrom && dto.dateTo) {
      const rangeStart = new Date(`${dto.dateFrom}T00:00:00Z`);
      const rangeEnd = new Date(`${dto.dateTo}T00:00:00Z`);
      if (
        Number.isNaN(rangeStart.getTime()) ||
        Number.isNaN(rangeEnd.getTime())
      ) {
        throw new BadRequestException(
          'Las fechas deben tener formato YYYY-MM-DD',
        );
      }
      if (rangeEnd < rangeStart) {
        throw new BadRequestException(
          'La fecha fin debe ser igual o posterior a la fecha inicio',
        );
      }
      const diffDays =
        (rangeEnd.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24);
      if (diffDays > 366) {
        throw new BadRequestException('El rango no puede exceder 366 días');
      }
      const dates: Date[] = [];
      const current = new Date(rangeStart);
      while (current <= rangeEnd) {
        dates.push(new Date(current));
        current.setUTCDate(current.getUTCDate() + 1);
      }
      return { rangeStart, rangeEnd, dates };
    }

    if (dto.month == null || dto.year == null) {
      throw new BadRequestException(
        'Debe indicar month/year o dateFrom/dateTo',
      );
    }
    if (dto.month < 1 || dto.month > 12) {
      throw new BadRequestException('El mes debe estar entre 1 y 12');
    }
    if (dto.year < 2020 || dto.year > 2100) {
      throw new BadRequestException('El año debe estar entre 2020 y 2100');
    }

    const daysInMonth = new Date(Date.UTC(dto.year, dto.month, 0)).getUTCDate();
    const rangeStart = new Date(Date.UTC(dto.year, dto.month - 1, 1));
    const rangeEnd = new Date(Date.UTC(dto.year, dto.month - 1, daysInMonth));
    const dates = Array.from(
      { length: daysInMonth },
      (_, index) => new Date(Date.UTC(dto.year!, dto.month! - 1, index + 1)),
    );
    return { rangeStart, rangeEnd, dates };
  }
}
