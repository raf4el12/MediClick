import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsDateString,
  IsInt,
  IsEnum,
  IsBoolean,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
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

  @ApiPropertyOptional({
    example: 1,
    description: 'Filtrar por sede (muestra globales + sede)',
  })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  clinicId?: number;

  @ApiPropertyOptional({
    example: true,
    description: 'Filtrar citas en riesgo de inasistencia (T-2h sin confirmar)',
  })
  @Transform(({ value }) =>
    value === 'true' || value === true || value === '1' || value === 1
      ? true
      : value === 'false' || value === false || value === '0' || value === 0
        ? false
        : undefined,
  )
  @IsBoolean()
  @IsOptional()
  isAtRisk?: boolean;
}
