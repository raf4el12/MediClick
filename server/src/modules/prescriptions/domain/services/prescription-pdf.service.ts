import { Injectable } from '@nestjs/common';
import { PdfService } from '../../../../shared/pdf/pdf.service.js';
import type { TDocumentDefinitions, Content } from 'pdfmake/interfaces.js';
import type { PrescriptionForPdf } from '../interfaces/prescription-data.interface.js';

@Injectable()
export class PrescriptionPdfService {
  constructor(private readonly pdfService: PdfService) {}

  async generate(data: PrescriptionForPdf): Promise<Buffer> {
    const docDefinition = this.buildDocDefinition(data);

    return this.pdfService.generate(docDefinition);
  }

  private buildDocDefinition(data: PrescriptionForPdf): TDocumentDefinitions {
    const doctor = data.appointment.schedule.doctor;
    const patient = data.appointment.patient;
    const clinic = doctor.clinic;
    const specialty = data.appointment.schedule.specialty;
    const scheduleDate = new Date(data.appointment.schedule.scheduleDate);

    const clinicName = clinic?.name ?? 'MediClick';
    const doctorFullName = `${doctor.profile.name} ${doctor.profile.lastName}`;
    const patientFullName = `${patient.profile.name} ${patient.profile.lastName}`;

    const formatDate = (date: Date): string =>
      date.toLocaleDateString('es-PE', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });

    // Cabecera de clínica
    const header: Content[] = [
      {
        text: clinicName.toUpperCase(),
        style: 'clinicName',
        alignment: 'center',
      },
    ];

    const clinicDetails: string[] = [];
    if (clinic?.address) clinicDetails.push(clinic.address);
    if (clinic?.phone) clinicDetails.push(`Tel: ${clinic.phone}`);
    if (clinicDetails.length > 0) {
      header.push({
        text: clinicDetails.join(' | '),
        style: 'clinicDetails',
        alignment: 'center',
      });
    }

    header.push({
      canvas: [
        {
          type: 'line',
          x1: 0,
          y1: 5,
          x2: 515,
          y2: 5,
          lineWidth: 1,
          lineColor: '#2196F3',
        },
      ],
      margin: [0, 5, 0, 10] as [number, number, number, number],
    });

    // Título y número
    const title: Content = {
      columns: [
        { text: 'RECETA MÉDICA', style: 'title', width: '*' },
        {
          text: `N° Receta: ${data.id}`,
          style: 'recetaNumber',
          alignment: 'right',
          width: 'auto',
        },
      ],
      margin: [0, 0, 0, 3] as [number, number, number, number],
    };

    const dateRow: Content = {
      text: `Fecha: ${formatDate(scheduleDate)}`,
      style: 'fieldValue',
      margin: [0, 0, 0, 15] as [number, number, number, number],
    };

    // Datos del paciente
    const documentText =
      patient.profile.typeDocument && patient.profile.numberDocument
        ? `${patient.profile.typeDocument}: ${patient.profile.numberDocument}`
        : 'No registrado';

    const patientSection: Content[] = [
      { text: 'PACIENTE', style: 'sectionHeader' },
      {
        columns: [
          {
            text: [
              { text: 'Nombre: ', style: 'fieldLabel' },
              { text: patientFullName, style: 'fieldValue' },
            ],
            width: '*',
          },
          {
            text: [
              { text: 'Documento: ', style: 'fieldLabel' },
              { text: documentText, style: 'fieldValue' },
            ],
            width: 'auto',
          },
        ],
        margin: [0, 0, 0, 10] as [number, number, number, number],
      },
    ];

    // Datos del médico
    const doctorSection: Content[] = [
      { text: 'MÉDICO', style: 'sectionHeader' },
      {
        columns: [
          {
            text: [
              { text: 'Dr(a). ', style: 'fieldLabel' },
              { text: doctorFullName, style: 'fieldValue' },
            ],
            width: '*',
          },
          {
            text: [
              { text: 'CMP: ', style: 'fieldLabel' },
              { text: doctor.licenseNumber, style: 'fieldValue' },
            ],
            width: 'auto',
          },
        ],
      },
      {
        text: [
          { text: 'Especialidad: ', style: 'fieldLabel' },
          { text: specialty.name, style: 'fieldValue' },
        ],
        margin: [0, 0, 0, 15] as [number, number, number, number],
      },
    ];

    // Separador
    const separator: Content = {
      canvas: [
        {
          type: 'line',
          x1: 0,
          y1: 0,
          x2: 515,
          y2: 0,
          lineWidth: 0.5,
          lineColor: '#CCCCCC',
        },
      ],
      margin: [0, 0, 0, 10] as [number, number, number, number],
    };

    // Tabla de medicamentos
    const medicationTable: Content[] = [
      { text: 'MEDICAMENTOS', style: 'sectionHeader' },
      {
        table: {
          headerRows: 1,
          widths: ['*', 'auto', 'auto', 'auto', 'auto'],
          body: [
            [
              { text: 'Medicamento', style: 'tableHeader' },
              { text: 'Dosis', style: 'tableHeader' },
              { text: 'Frecuencia', style: 'tableHeader' },
              { text: 'Duración', style: 'tableHeader' },
              { text: 'Notas', style: 'tableHeader' },
            ],
            ...data.items.map((item) => [
              { text: item.medication, fontSize: 9 },
              { text: item.dosage, fontSize: 9 },
              { text: item.frequency, fontSize: 9 },
              { text: item.duration, fontSize: 9 },
              { text: item.notes ?? '-', fontSize: 9 },
            ]),
          ],
        },
        layout: {
          hLineWidth: () => 0.5,
          vLineWidth: () => 0.5,
          hLineColor: () => '#CCCCCC',
          vLineColor: () => '#CCCCCC',
          fillColor: (rowIndex: number) => (rowIndex === 0 ? '#F5F5F5' : null),
          paddingLeft: () => 6,
          paddingRight: () => 6,
          paddingTop: () => 4,
          paddingBottom: () => 4,
        },
        margin: [0, 0, 0, 15] as [number, number, number, number],
      },
    ];

    // Instrucciones generales
    const instructionsSection: Content[] = [];
    if (data.instructions) {
      instructionsSection.push(
        { text: 'INSTRUCCIONES GENERALES', style: 'sectionHeader' },
        {
          text: data.instructions,
          style: 'fieldValue',
          margin: [0, 0, 0, 10] as [number, number, number, number],
        },
      );
    }

    // Validez
    const validitySection: Content[] = [];
    if (data.validUntil) {
      validitySection.push({
        text: [
          { text: 'Válida hasta: ', style: 'fieldLabel' },
          {
            text: formatDate(new Date(data.validUntil)),
            style: 'fieldValue',
          },
        ],
        margin: [0, 0, 0, 20] as [number, number, number, number],
      });
    }

    // Firma
    const signatureSection: Content[] = [
      { text: '', margin: [0, 30, 0, 0] as [number, number, number, number] },
      {
        canvas: [
          {
            type: 'line',
            x1: 150,
            y1: 0,
            x2: 365,
            y2: 0,
            lineWidth: 1,
            lineColor: '#333333',
          },
        ],
      },
      {
        text: `Dr(a). ${doctorFullName}`,
        alignment: 'center',
        style: 'fieldValue',
        margin: [0, 5, 0, 0] as [number, number, number, number],
      },
      {
        text: `CMP: ${doctor.licenseNumber}`,
        alignment: 'center',
        style: 'fieldLabel',
        margin: [0, 2, 0, 0] as [number, number, number, number],
      },
    ];

    // Pie
    const now = new Date();
    const footer: Content = {
      stack: [
        {
          canvas: [
            {
              type: 'line',
              x1: 0,
              y1: 0,
              x2: 515,
              y2: 0,
              lineWidth: 0.5,
              lineColor: '#CCCCCC',
            },
          ],
          margin: [0, 20, 0, 5] as [number, number, number, number],
        },
        {
          text: `Generado el ${formatDate(now)} | MediClick`,
          alignment: 'center',
          fontSize: 8,
          color: '#999999',
        },
      ],
    };

    return {
      pageSize: 'A4',
      pageMargins: [40, 40, 40, 40],
      content: [
        ...header,
        title,
        dateRow,
        ...patientSection,
        ...doctorSection,
        separator,
        ...medicationTable,
        ...instructionsSection,
        ...validitySection,
        ...signatureSection,
        footer,
      ],
      styles: {
        clinicName: { fontSize: 16, bold: true, color: '#2196F3' },
        clinicDetails: {
          fontSize: 9,
          color: '#666666',
          margin: [0, 2, 0, 0],
        },
        title: { fontSize: 14, bold: true, color: '#333333' },
        recetaNumber: { fontSize: 10, color: '#666666' },
        sectionHeader: {
          fontSize: 10,
          bold: true,
          color: '#2196F3',
          margin: [0, 0, 0, 5],
        },
        fieldLabel: { fontSize: 9, color: '#666666' },
        fieldValue: { fontSize: 10, color: '#333333' },
        tableHeader: {
          fontSize: 9,
          bold: true,
          color: '#333333',
        },
      },
    };
  }
}
