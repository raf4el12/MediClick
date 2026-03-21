import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateMedicalHistoryDto {
  @ApiProperty({ example: 1, description: 'ID del paciente' })
  @Type(() => Number)
  @IsInt()
  @IsNotEmpty({ message: 'El patientId es obligatorio' })
  patientId: number;

  @ApiProperty({
    example: 'Diabetes Tipo 2',
    description: 'Condición o diagnóstico',
  })
  @IsString()
  @IsNotEmpty({ message: 'La condición es obligatoria' })
  condition: string;

  @ApiPropertyOptional({
    example:
      'Paciente diagnosticado con diabetes tipo 2, con tratamiento de metformina.',
    description: 'Descripción detallada',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    example: '2024-06-15',
    description: 'Fecha de diagnóstico',
  })
  @IsDateString()
  @IsOptional()
  diagnosedDate?: string;

  @ApiPropertyOptional({
    example: 'ACTIVE',
    enum: ['ACTIVE', 'RESOLVED', 'CHRONIC'],
    description: 'Estado de la condición',
  })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({
    example: 'Control cada 3 meses, HbA1c target <7%',
    description: 'Notas adicionales',
  })
  @IsString()
  @IsOptional()
  notes?: string;
}
