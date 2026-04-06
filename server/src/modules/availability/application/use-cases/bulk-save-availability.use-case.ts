import {
  Injectable,
  Inject,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { BulkSaveAvailabilityDto } from '../dto/bulk-save-availability.dto.js';
import { AvailabilityResponseDto } from '../dto/availability-response.dto.js';
import type { IAvailabilityRepository } from '../../domain/repositories/availability.repository.js';
import type { IDoctorRepository } from '../../../doctors/domain/repositories/doctor.repository.js';
import { ScheduleRegenerationService } from '../../../schedules/domain/services/schedule-regeneration.service.js';
import {
  timeStringToDate,
  dateToTimeString,
} from '../../../../shared/utils/date-time.utils.js';

@Injectable()
export class BulkSaveAvailabilityUseCase {
  constructor(
    @Inject('IAvailabilityRepository')
    private readonly availabilityRepository: IAvailabilityRepository,
    @Inject('IDoctorRepository')
    private readonly doctorRepository: IDoctorRepository,
    private readonly scheduleRegenerationService: ScheduleRegenerationService,
  ) {}

  async execute(
    dto: BulkSaveAvailabilityDto,
    jwtClinicId?: number | null,
  ): Promise<AvailabilityResponseDto[]> {
    const doctor = await this.doctorRepository.findById(dto.doctorId);
    if (!doctor) {
      throw new BadRequestException('El doctor especificado no existe');
    }

    if (jwtClinicId && doctor.clinicId !== jwtClinicId) {
      throw new ForbiddenException(
        'No puede crear disponibilidad para un doctor de otra sede',
      );
    }

    const hasDoctorSpecialty =
      await this.availabilityRepository.existsDoctorSpecialty(
        dto.doctorId,
        dto.specialtyId,
      );
    if (!hasDoctorSpecialty) {
      throw new BadRequestException(
        'El doctor no tiene asignada la especialidad especificada',
      );
    }

    // Validate all entries
    for (const entry of dto.entries) {
      const timeFrom = timeStringToDate(entry.timeFrom);
      const timeTo = timeStringToDate(entry.timeTo);
      if (timeFrom >= timeTo) {
        throw new BadRequestException(
          `La hora de inicio (${entry.timeFrom}) debe ser menor a la hora de fin (${entry.timeTo}) para ${entry.dayOfWeek}`,
        );
      }

      const startDate = new Date(entry.startDate);
      const endDate = new Date(entry.endDate);
      if (startDate >= endDate) {
        throw new BadRequestException(
          'La fecha de inicio debe ser menor a la fecha de fin',
        );
      }
    }

    // Soft-delete ALL active availability for this doctor
    await this.availabilityRepository.softDeleteByDoctor(dto.doctorId);

    // Create all new entries
    const results: AvailabilityResponseDto[] = [];

    for (const entry of dto.entries) {
      const availability = await this.availabilityRepository.create({
        doctorId: dto.doctorId,
        specialtyId: dto.specialtyId,
        startDate: new Date(entry.startDate),
        endDate: new Date(entry.endDate),
        dayOfWeek: entry.dayOfWeek,
        timeFrom: timeStringToDate(entry.timeFrom),
        timeTo: timeStringToDate(entry.timeTo),
        type: entry.type,
        reason: entry.reason,
        clinicId: doctor.clinicId ?? null,
      });

      results.push({
        id: availability.id,
        doctorId: availability.doctorId,
        specialtyId: availability.specialtyId,
        startDate: availability.startDate,
        endDate: availability.endDate,
        dayOfWeek: availability.dayOfWeek,
        timeFrom: dateToTimeString(availability.timeFrom),
        timeTo: dateToTimeString(availability.timeTo),
        isAvailable: availability.isAvailable,
        type: availability.type,
        reason: availability.reason,
        doctor: {
          id: availability.doctor.id,
          name: availability.doctor.profile.name,
          lastName: availability.doctor.profile.lastName,
        },
        specialty: availability.specialty,
        createdAt: availability.createdAt,
      });
    }

    // Regenerate schedules for the affected date range
    if (dto.entries.length > 0) {
      const allDates = dto.entries.flatMap((e) => [
        new Date(e.startDate),
        new Date(e.endDate),
      ]);
      const regenStart = new Date(
        Math.min(...allDates.map((d) => d.getTime())),
      );
      const regenEnd = new Date(
        Math.max(...allDates.map((d) => d.getTime())),
      );

      await this.scheduleRegenerationService.regenerateForDoctor(
        dto.doctorId,
        regenStart,
        regenEnd,
      );
    }

    return results;
  }
}
