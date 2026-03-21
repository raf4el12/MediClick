import {
  Injectable,
  Inject,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { CreateScheduleBlockDto } from '../dto/create-schedule-block.dto.js';
import { ScheduleBlockResponseDto } from '../dto/schedule-block-response.dto.js';
import type { IScheduleBlockRepository } from '../../domain/repositories/schedule-block.repository.js';
import type { IDoctorRepository } from '../../../doctors/domain/repositories/doctor.repository.js';
import { ScheduleRegenerationService } from '../../../schedules/domain/services/schedule-regeneration.service.js';
import {
  timeStringToDate,
  dateToTimeString,
} from '../../../../shared/utils/date-time.utils.js';

@Injectable()
export class CreateScheduleBlockUseCase {
  constructor(
    @Inject('IScheduleBlockRepository')
    private readonly scheduleBlockRepository: IScheduleBlockRepository,
    @Inject('IDoctorRepository')
    private readonly doctorRepository: IDoctorRepository,
    private readonly scheduleRegenerationService: ScheduleRegenerationService,
  ) {}

  async execute(
    dto: CreateScheduleBlockDto,
  ): Promise<ScheduleBlockResponseDto> {
    // Validar que el doctor exista
    const doctor = await this.doctorRepository.findById(dto.doctorId);
    if (!doctor) {
      throw new NotFoundException('Doctor no encontrado');
    }

    // Validar que si el tipo es TIME_RANGE, se proporcionen las horas
    if (dto.type === 'TIME_RANGE') {
      if (!dto.timeFrom || !dto.timeTo) {
        throw new BadRequestException(
          'Para bloqueos de tipo TIME_RANGE, timeFrom y timeTo son obligatorios',
        );
      }

      const from = timeStringToDate(dto.timeFrom);
      const to = timeStringToDate(dto.timeTo);

      if (from >= to) {
        throw new BadRequestException(
          'La hora de inicio (timeFrom) debe ser anterior a la hora de fin (timeTo)',
        );
      }
    }

    // Parsear fechas y horas
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    if (startDate > endDate) {
      throw new BadRequestException(
        'La fecha de inicio debe ser anterior o igual a la fecha de fin',
      );
    }

    const block = await this.scheduleBlockRepository.create({
      doctorId: dto.doctorId,
      type: dto.type,
      startDate,
      endDate,
      timeFrom: dto.timeFrom ? timeStringToDate(dto.timeFrom) : undefined,
      timeTo: dto.timeTo ? timeStringToDate(dto.timeTo) : undefined,
      reason: dto.reason,
    });

    // Regenerar schedules afectados por el nuevo bloqueo
    await this.scheduleRegenerationService.regenerateForDoctor(
      dto.doctorId,
      startDate,
      endDate,
    );

    return {
      id: block.id,
      doctorId: block.doctorId,
      type: block.type,
      startDate: block.startDate,
      endDate: block.endDate,
      timeFrom: block.timeFrom ? dateToTimeString(block.timeFrom) : null,
      timeTo: block.timeTo ? dateToTimeString(block.timeTo) : null,
      reason: block.reason,
      isActive: block.isActive,
      createdAt: block.createdAt,
      doctor: {
        id: block.doctor.id,
        name: block.doctor.profile.name,
        lastName: block.doctor.profile.lastName,
      },
    };
  }
}
