import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsDateString,
  IsEnum,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { WaitlistTimePreference } from '../../domain/enums/waitlist-time-preference.enum.js';

export class JoinWaitlistDto {
  @ApiProperty({ example: 3, description: 'ID de la especialidad deseada' })
  @Type(() => Number)
  @IsInt()
  @IsNotEmpty({ message: 'El specialtyId es obligatorio' })
  specialtyId: number;

  @ApiPropertyOptional({
    example: 7,
    description: 'ID del doctor preferido. Omitir para cualquier doctor.',
  })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  doctorId?: number;

  @ApiProperty({
    example: '2026-06-01',
    description: 'Inicio de la ventana de búsqueda (ISO)',
  })
  @IsDateString()
  @IsNotEmpty()
  dateFrom: string;

  @ApiProperty({
    example: '2026-06-15',
    description: 'Fin de la ventana de búsqueda (ISO)',
  })
  @IsDateString()
  @IsNotEmpty()
  dateTo: string;

  @ApiPropertyOptional({
    enum: WaitlistTimePreference,
    example: WaitlistTimePreference.MORNING,
    description: 'Franja horaria preferida',
  })
  @IsEnum(WaitlistTimePreference)
  @IsOptional()
  timePreference?: WaitlistTimePreference;

  @ApiPropertyOptional({ example: 'Disponible con poca antelación' })
  @IsString()
  @MaxLength(300)
  @IsOptional()
  notes?: string;
}
