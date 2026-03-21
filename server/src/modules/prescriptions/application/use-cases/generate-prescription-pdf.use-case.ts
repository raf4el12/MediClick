import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import type { IPrescriptionRepository } from '../../domain/repositories/prescription.repository.js';
import { PrescriptionPdfService } from '../../domain/services/prescription-pdf.service.js';

@Injectable()
export class GeneratePrescriptionPdfUseCase {
  constructor(
    @Inject('IPrescriptionRepository')
    private readonly prescriptionRepository: IPrescriptionRepository,
    private readonly pdfService: PrescriptionPdfService,
  ) {}

  async execute(userId: number, appointmentId: number): Promise<Buffer> {
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
