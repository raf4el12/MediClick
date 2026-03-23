import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  LookupDocumentDto,
  LookupDocumentResponseDto,
} from '../dto/lookup-document.dto.js';

/**
 * Respuesta de decolecta.com (v1)
 * GET https://api.decolecta.com/v1/reniec/dni?numero=DNI
 */
interface DecolectaResponse {
  first_name: string;
  first_last_name: string;
  second_last_name: string;
  full_name: string;
  document_number: string;
}

@Injectable()
export class LookupDocumentUseCase {
  private readonly logger = new Logger(LookupDocumentUseCase.name);
  private readonly apiToken: string | undefined;

  constructor(private readonly configService: ConfigService) {
    this.apiToken = this.configService.get<string>('RENIEC_API_TOKEN');
  }

  async execute(dto: LookupDocumentDto): Promise<LookupDocumentResponseDto> {
    if (dto.typeDocument !== 'DNI') {
      return { found: false };
    }

    if (!/^\d{8}$/.test(dto.numberDocument)) {
      return { found: false };
    }

    if (!this.apiToken) {
      this.logger.warn(
        'RENIEC_API_TOKEN no configurado. La consulta de DNI no está disponible.',
      );
      return { found: false };
    }

    try {
      const url = `https://api.decolecta.com/v1/reniec/dni?numero=${dto.numberDocument}`;

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${this.apiToken}`,
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        this.logger.warn(
          `RENIEC API respondió con estado ${response.status} para DNI ${dto.numberDocument}`,
        );
        return { found: false };
      }

      const data = (await response.json()) as DecolectaResponse;

      if (!data.first_name) {
        return { found: false };
      }

      const capitalize = (s: string) =>
        s.toLowerCase().replace(/(?:^|\s)\S/g, (c) => c.toUpperCase());

      return {
        found: true,
        name: capitalize(data.first_name),
        lastName: capitalize(
          `${data.first_last_name} ${data.second_last_name}`.trim(),
        ),
      };
    } catch (error) {
      this.logger.warn(
        `Error al consultar RENIEC API: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return { found: false };
    }
  }
}
