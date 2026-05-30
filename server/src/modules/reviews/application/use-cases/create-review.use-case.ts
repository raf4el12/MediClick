import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { AppointmentStatus } from '../../../../shared/domain/enums/appointment-status.enum.js';
import { CreateReviewDto } from '../dto/create-review.dto.js';
import { ReviewResponseDto } from '../dto/review-response.dto.js';
import { toReviewResponse } from '../mappers/review.mapper.js';
import type { IReviewRepository } from '../../domain/repositories/review.repository.js';
import type { IAppointmentRepository } from '../../../appointments/domain/repositories/appointment.repository.js';
import type { IPatientRepository } from '../../../patients/domain/repositories/patient.repository.js';

@Injectable()
export class CreateReviewUseCase {
  constructor(
    @Inject('IReviewRepository')
    private readonly reviewRepository: IReviewRepository,
    @Inject('IAppointmentRepository')
    private readonly appointmentRepository: IAppointmentRepository,
    @Inject('IPatientRepository')
    private readonly patientRepository: IPatientRepository,
  ) {}

  async execute(
    userId: number,
    dto: CreateReviewDto,
    clinicId: number | null,
  ): Promise<ReviewResponseDto> {
    const appointment = await this.appointmentRepository.findById(
      dto.appointmentId,
    );
    if (!appointment) {
      throw new NotFoundException('Cita no encontrada');
    }

    const patient = await this.patientRepository.findByUserId(userId);
    if (!patient) {
      throw new BadRequestException(
        'No se encontró un paciente asociado a este usuario',
      );
    }

    // La cita debe pertenecer al paciente autenticado.
    if (appointment.patientId !== patient.id) {
      throw new ForbiddenException('No puedes reseñar una cita que no es tuya');
    }

    // Solo se reseñan consultas efectivamente realizadas.
    if (appointment.status !== AppointmentStatus.COMPLETED) {
      throw new BadRequestException(
        'Solo puedes reseñar consultas completadas',
      );
    }

    // Una reseña por cita.
    if (await this.reviewRepository.existsByAppointmentId(dto.appointmentId)) {
      throw new ConflictException('Esta cita ya tiene una reseña');
    }

    // doctorId y clinicId se derivan del servidor, nunca del cliente.
    const review = await this.reviewRepository.create({
      appointmentId: dto.appointmentId,
      doctorId: appointment.schedule.doctor.id,
      patientId: patient.id,
      rating: dto.rating,
      comment: dto.comment,
      clinicId,
    });

    return toReviewResponse(review);
  }
}
