import { IsOptional, IsEnum, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { SecurityEventType } from '@prisma/client';
import { PaginationDto } from '../../utils/dtos/pagination-dto.js';

export class FindAuditLogsDto extends PaginationDto {
  @ApiPropertyOptional({
    enum: SecurityEventType,
    description: 'Filtrar por tipo de evento de seguridad',
  })
  @IsOptional()
  @IsEnum(SecurityEventType, { message: 'El tipo de evento debe ser válido' })
  eventType?: SecurityEventType;

  @ApiPropertyOptional({
    description: 'Fecha desde (ISO 8601), inclusive',
  })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({
    description: 'Fecha hasta (ISO 8601), inclusive',
  })
  @IsOptional()
  @IsDateString()
  to?: string;
}
