import { Injectable } from '@nestjs/common';
import pdfmake from 'pdfmake';
import type { TDocumentDefinitions } from 'pdfmake/interfaces.js';

@Injectable()
export class PdfService {
  constructor() {
    pdfmake.setFonts({
      Roboto: {
        normal: 'node_modules/pdfmake/build/fonts/Roboto/Roboto-Regular.ttf',
        bold: 'node_modules/pdfmake/build/fonts/Roboto/Roboto-Medium.ttf',
        italics: 'node_modules/pdfmake/build/fonts/Roboto/Roboto-Italic.ttf',
        bolditalics:
          'node_modules/pdfmake/build/fonts/Roboto/Roboto-MediumItalic.ttf',
      },
    });
  }

  async generate(docDefinition: TDocumentDefinitions): Promise<Buffer> {
    const pdf = pdfmake.createPdf(docDefinition);

    return pdf.getBuffer();
  }
}
