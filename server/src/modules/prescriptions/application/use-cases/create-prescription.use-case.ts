import {
  Injectable,
  Inject,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { CreatePrescriptionDto } from '../dto/create-prescription.dto.js';
import { PrescriptionResponseDto } from '../dto/prescription-response.dto.js';
import type { IPrescriptionRepository } from '../../domain/repositories/prescription.repository.js';
import type { IAppointmentRepository } from '../../../appointments/domain/repositories/appointment.repository.js';
import type { IDoctorRepository } from '../../../doctors/domain/repositories/doctor.repository.js';
import { AppointmentStatus } from '../../../../shared/domain/enums/appointment-status.enum.js';

@Injectable()
export class CreatePrescriptionUseCase {
  constructor(
    @Inject('IPrescriptionRepository')
    private readonly prescriptionRepository: IPrescriptionRepository,
    @Inject('IAppointmentRepository')
    private readonly appointmentRepository: IAppointmentRepository,
    @Inject('IDoctorRepository')
    private readonly doctorRepository: IDoctorRepository,
  ) {}

  async execute(
    userId: number,
    dto: CreatePrescriptionDto,
  ): Promise<PrescriptionResponseDto> {
    const appointment = await this.appointmentRepository.findById(dto.appointmentId);
    if (!appointment) {
      throw new NotFoundException('Cita no encontrada');
    }

    // Verificar que el doctor autenticado es dueño de esta cita
    const doctorId = await this.doctorRepository.findDoctorIdByUserId(userId);
    if (!doctorId) {
      throw new BadRequestException('No se encontró un doctor asociado a este usuario');
    }

    if (appointment.schedule.doctor.id !== doctorId) {
      throw new ForbiddenException('No tiene permiso para crear recetas en esta cita');
    }

    // Verificar que la cita esté en un estado válido para recetar
    if (appointment.status === AppointmentStatus.CANCELLED) {
      throw new BadRequestException('No se puede crear receta para una cita cancelada');
    }

    // Verificar que no exista ya una receta para esta cita (relación @unique)
    const existingPrescription = await this.prescriptionRepository.findByAppointmentId(
      dto.appointmentId,
    );
    if (existingPrescription) {
      throw new ConflictException('Ya existe una receta para esta cita');
    }

    // Transacción: Crear receta + items + auto-completar cita
    const prescription = await this.prescriptionRepository.createWithAutoComplete({
      appointmentId: dto.appointmentId,
      instructions: dto.instructions,
      validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined,
      items: dto.items.map((item) => ({
        medication: item.medication,
        dosage: item.dosage,
        frequency: item.frequency,
        duration: item.duration,
        notes: item.notes,
      })),
    });

    return this.toResponse(prescription);
  }

  private toResponse(p: any): PrescriptionResponseDto {
    return {
      id: p.id,
      appointmentId: p.appointmentId,
      instructions: p.instructions,
      validUntil: p.validUntil,
      items: p.items.map((i: any) => ({
        id: i.id,
        medication: i.medication,
        dosage: i.dosage,
        frequency: i.frequency,
        duration: i.duration,
        notes: i.notes,
      })),
      patient: {
        id: p.appointment.patient.id,
        name: p.appointment.patient.profile.name,
        lastName: p.appointment.patient.profile.lastName,
      },
      doctor: {
        id: p.appointment.schedule.doctor.id,
        name: p.appointment.schedule.doctor.profile.name,
        lastName: p.appointment.schedule.doctor.profile.lastName,
      },
      specialtyName: p.appointment.schedule.specialty.name,
      scheduleDate: p.appointment.schedule.scheduleDate,
      appointmentStatus: p.appointment.status,
      createdAt: p.createdAt,
    };
  }
}
