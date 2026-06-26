import { Injectable, Logger } from '@nestjs/common';
import { Prisma, SecurityEventType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';

export interface SecurityAuditEntry {
  eventType: SecurityEventType;
  userId?: number | null;
  email?: string | null;
  clinicId?: number | null;
  ip?: string | null;
  userAgent?: string | null;
  resource?: string | null;
  metadata?: Record<string, unknown> | null;
}

@Injectable()
export class SecurityAuditService {
  private readonly logger = new Logger(SecurityAuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Persiste un evento de seguridad. Nunca lanza: un fallo de auditoría no debe
   * convertir un 401/403 en un 500 ni bloquear la request. Llamar con `void`.
   */
  async record(entry: SecurityAuditEntry): Promise<void> {
    try {
      await this.prisma.securityAuditLogs.create({
        data: {
          eventType: entry.eventType,
          userId: entry.userId ?? null,
          email: entry.email ?? null,
          clinicId: entry.clinicId ?? null,
          ip: entry.ip ?? null,
          userAgent: entry.userAgent ?? null,
          resource: entry.resource ?? null,
          metadata: (entry.metadata ?? undefined) as
            | Prisma.InputJsonValue
            | undefined,
        },
      });
    } catch (err) {
      this.logger.warn(
        `No se pudo registrar el evento de seguridad ${entry.eventType}: ${
          (err as Error).message
        }`,
      );
    }
  }
}
