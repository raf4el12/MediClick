import {
  Injectable,
  Inject,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { CreateAvailabilityDto } from '../dto/create-availability.dto.js';
import { AvailabilityResponseDto } from '../dto/availability-response.dto.js';
import type { IAvailabilityRepository } from '../../domain/repositories/availability.repository.js';
import type { IDoctorRepository } from '../../../doctors/domain/repositories/doctor.repository.js';

function timeStringToDate(time: string): Date {
  const [hours, minutes] = time.split(':').map(Number);
  const date = new Date(1970, 0, 1, hours, minutes, 0, 0);
  return date;
}

function dateToTimeString(date: Date): string {
  const h = date.getHours().toString().padStart(2, '0');
  const m = date.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
}

@Injectable()
export class CreateAvailabilityUseCase {
  constructor(
    @Inject('IAvailabilityRepository')
    private readonly availabilityRepository: IAvailabilityRepository,
    @Inject('IDoctorRepository')
    private readonly doctorRepository: IDoctorRepository,
  ) {}

  async execute(dto: CreateAvailabilityDto): Promise<AvailabilityResponseDto> {
    const doctor = await this.doctorRepository.findById(dto.doctorId);
    if (!doctor) {
      throw new BadRequestException('El doctor especificado no existe');
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

    const timeFrom = timeStringToDate(dto.timeFrom);
    const timeTo = timeStringToDate(dto.timeTo);

    if (timeFrom >= timeTo) {
      throw new BadRequestException(
        'La hora de inicio debe ser menor a la hora de fin',
      );
    }

    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    if (startDate >= endDate) {
      throw new BadRequestException(
        'La fecha de inicio debe ser menor a la fecha de fin',
      );
    }

    const overlapping = await this.availabilityRepository.findOverlapping(
      dto.doctorId,
      dto.dayOfWeek,
      timeFrom,
      timeTo,
    );

    if (overlapping.length > 0) {
      throw new ConflictException(
        'El doctor ya tiene un horario que se solapa en ese día y rango de horas',
      );
    }

    const availability = await this.availabilityRepository.create({
      doctorId: dto.doctorId,
      specialtyId: dto.specialtyId,
      startDate,
      endDate,
      dayOfWeek: dto.dayOfWeek,
      timeFrom,
      timeTo,
      type: dto.type,
      reason: dto.reason,
    });

    return {
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
    };
  }
}
