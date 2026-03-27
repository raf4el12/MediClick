import {
  Injectable,
  Inject,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import type { IPrescriptionRepository } from '../../domain/repositories/prescription.repository.js';
import type { IAppointmentRepository } from '../../../appointments/domain/repositories/appointment.repository.js';
import type { IDoctorRepository } from '../../../doctors/domain/repositories/doctor.repository.js';
import { PrescriptionPdfService } from '../../domain/services/prescription-pdf.service.js';
import { UserRole } from '../../../../shared/domain/enums/user-role.enum.js';

@Injectable()
export class GeneratePrescriptionPdfUseCase {
  constructor(
    @Inject('IPrescriptionRepository')
    private readonly prescriptionRepository: IPrescriptionRepository,
    @Inject('IAppointmentRepository')
    private readonly appointmentRepository: IAppointmentRepository,
    @Inject('IDoctorRepository')
    private readonly doctorRepository: IDoctorRepository,
    private readonly pdfService: PrescriptionPdfService,
  ) {}

  async execute(
    userId: number,
    appointmentId: number,
    role?: string,
  ): Promise<Buffer> {
    // Doctores solo pueden descargar PDFs de sus propias citas
    if (role === UserRole.DOCTOR) {
      const appointment =
        await this.appointmentRepository.findById(appointmentId);
      if (!appointment) {
        throw new NotFoundException('Cita no encontrada');
      }

      const doctorId =
        await this.doctorRepository.findDoctorIdByUserId(userId);
      if (appointment.schedule.doctor.id !== doctorId) {
        throw new ForbiddenException(
          'No tiene permiso para descargar esta receta',
        );
      }
    }

    const prescription =
      await this.prescriptionRepository.findByAppointmentIdForPdf(
        appointmentId,
      );
    if (!prescription) {
      throw new NotFoundException('No se encontró receta para esta cita');
    }

    return this.pdfService.generate(prescription);
  }
}
