import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsBoolean, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import { AppointmentStatus } from '../../../../shared/domain/enums/appointment-status.enum.js';
import { PaginationDto } from '../../../../shared/utils/dtos/pagination-dto.js';

export class MyAppointmentsFilterDto extends PaginationDto {
  @ApiPropertyOptional({
    enum: AppointmentStatus,
    description: 'Filtrar por estado',
  })
  @IsEnum(AppointmentStatus)
  @IsOptional()
  status?: AppointmentStatus;

  @ApiPropertyOptional({
    example: true,
    description: 'Solo citas próximas (fecha >= hoy)',
  })
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  @IsOptional()
  upcoming?: boolean;

  @ApiPropertyOptional({
    example: 'America/Lima',
    description: 'Zona horaria IANA del cliente para calcular "hoy"',
  })
  @IsString()
  @IsOptional()
  timezone?: string;
}
