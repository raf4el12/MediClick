import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SecurityEventType } from '@prisma/client';

export class AuditLogResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty({ enum: SecurityEventType })
  eventType: SecurityEventType;

  @ApiPropertyOptional()
  userId: number | null;

  @ApiPropertyOptional()
  email: string | null;

  @ApiPropertyOptional()
  clinicId: number | null;

  @ApiPropertyOptional()
  ip: string | null;

  @ApiPropertyOptional()
  userAgent: string | null;

  @ApiPropertyOptional()
  resource: string | null;

  @ApiPropertyOptional()
  metadata: Record<string, unknown> | null;

  @ApiProperty()
  createdAt: Date;
}

export class PaginatedAuditLogResponseDto {
  @ApiProperty()
  totalRows: number;

  @ApiProperty({ type: [AuditLogResponseDto] })
  rows: AuditLogResponseDto[];

  @ApiProperty()
  totalPages: number;

  @ApiProperty()
  currentPage: number;
}
