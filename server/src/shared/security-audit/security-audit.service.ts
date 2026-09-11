import { Injectable, Logger } from '@nestjs/common';
import { Prisma, SecurityEventType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { PaginatedResult } from '../domain/interfaces/paginated-result.interface.js';
import type { PaginationImproved } from '../utils/value-objects/pagination-improved.value-object.js';

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

export interface AuditLogFilters {
  eventType?: SecurityEventType;
  from?: string;
  to?: string;
}

export interface AuditLogRecord {
  id: number;
  eventType: SecurityEventType;
  userId: number | null;
  email: string | null;
  clinicId: number | null;
  ip: string | null;
  userAgent: string | null;
  resource: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
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

  /**
   * Consulta paginada de la bitácora, para el equipo de operaciones.
   * Solo lectura — no hay mutaciones expuestas fuera de `record`.
   */
  async findAllPaginated(
    pagination: PaginationImproved,
    filters: AuditLogFilters = {},
  ): Promise<PaginatedResult<AuditLogRecord>> {
    const { limit, offset } = pagination.getOffsetLimit();

    const where: Prisma.SecurityAuditLogsWhereInput = {
      ...(filters.eventType && { eventType: filters.eventType }),
      ...((filters.from || filters.to) && {
        createdAt: {
          ...(filters.from && { gte: new Date(filters.from) }),
          ...(filters.to && { lte: new Date(filters.to) }),
        },
      }),
    };

    const [rows, totalRows] = await Promise.all([
      this.prisma.securityAuditLogs.findMany({
        where,
        skip: offset,
        take: limit,
        orderBy: pagination.getOrderBy('createdAt'),
      }),
      this.prisma.securityAuditLogs.count({ where }),
    ]);

    return {
      totalRows,
      rows: rows.map((row) => ({
        ...row,
        metadata: row.metadata as Record<string, unknown> | null,
      })),
      totalPages: Math.ceil(totalRows / limit),
      currentPage: pagination.currentPage,
    };
  }
}
