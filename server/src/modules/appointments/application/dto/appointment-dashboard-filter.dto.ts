import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsDateString,
  IsInt,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AppointmentStatus } from '../../../../shared/domain/enums/appointment-status.enum.js';
import { PaginationDto } from '../../../../shared/utils/dtos/pagination-dto.js';

export class AppointmentDashboardFilterDto extends PaginationDto {
  @ApiPropertyOptional({
    example: '2026-03-01',
    description: 'Fecha desde (YYYY-MM-DD)',
  })
  @IsDateString()
  @IsOptional()
  dateFrom?: string;

  @ApiPropertyOptional({
    example: '2026-03-31',
    description: 'Fecha hasta (YYYY-MM-DD)',
  })
  @IsDateString()
  @IsOptional()
  dateTo?: string;

  @ApiPropertyOptional({ example: 1, description: 'Filtrar por doctor' })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  doctorId?: number;

  @ApiPropertyOptional({ example: 1, description: 'Filtrar por especialidad' })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  specialtyId?: number;

  @ApiPropertyOptional({
    enum: AppointmentStatus,
    description: 'Filtrar por estado',
  })
  @IsEnum(AppointmentStatus)
  @IsOptional()
  status?: AppointmentStatus;
}
