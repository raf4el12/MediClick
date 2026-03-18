import {
  Injectable,
  Inject,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import type { IPrescriptionRepository } from '../../domain/repositories/prescription.repository.js';
import type { IDoctorRepository } from '../../../doctors/domain/repositories/doctor.repository.js';
import { PrescriptionPdfService } from '../../domain/services/prescription-pdf.service.js';

@Injectable()
export class GeneratePrescriptionPdfUseCase {
  constructor(
    @Inject('IPrescriptionRepository')
    private readonly prescriptionRepository: IPrescriptionRepository,
    @Inject('IDoctorRepository')
    private readonly doctorRepository: IDoctorRepository,
    private readonly pdfService: PrescriptionPdfService,
  ) {}

  async execute(userId: number, appointmentId: number): Promise<Buffer> {
    const doctorId = await this.doctorRepository.findDoctorIdByUserId(userId);
    if (!doctorId) {
      throw new BadRequestException(
        'No se encontró un doctor asociado a este usuario',
      );
    }

    const appointmentDoctorId =
      await this.prescriptionRepository.findAppointmentDoctorId(appointmentId);
    if (appointmentDoctorId !== null && appointmentDoctorId !== doctorId) {
      throw new ForbiddenException(
        'No tiene permiso para ver recetas de esta cita',
      );
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
