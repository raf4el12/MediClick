import {
  Injectable,
  Inject,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import type { IPrescriptionRepository } from '../../domain/repositories/prescription.repository.js';
import type { IPatientRepository } from '../../../patients/domain/repositories/patient.repository.js';
import { PrescriptionPdfService } from '../../domain/services/prescription-pdf.service.js';

@Injectable()
export class GenerateMyPrescriptionPdfUseCase {
  constructor(
    @Inject('IPrescriptionRepository')
    private readonly prescriptionRepository: IPrescriptionRepository,
    @Inject('IPatientRepository')
    private readonly patientRepository: IPatientRepository,
    private readonly pdfService: PrescriptionPdfService,
  ) {}

  async execute(userId: number, appointmentId: number): Promise<Buffer> {
    const patient = await this.patientRepository.findByUserId(userId);
    if (!patient) {
      throw new BadRequestException(
        'No se encontró un paciente asociado a este usuario',
      );
    }

    const prescription =
      await this.prescriptionRepository.findByAppointmentIdForPdf(
        appointmentId,
      );
    if (!prescription) {
      throw new NotFoundException('No se encontró receta para esta cita');
    }

    if (prescription.appointment.patient.id !== patient.id) {
      throw new ForbiddenException(
        'No tiene permiso para ver recetas de esta cita',
      );
    }

    return this.pdfService.generate(prescription);
  }
}
