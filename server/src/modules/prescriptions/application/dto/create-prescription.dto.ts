import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

export class PrescriptionItemDto {
  @ApiProperty({ example: 'Ibuprofeno', description: 'Nombre del medicamento' })
  @IsString()
  @IsNotEmpty({ message: 'El medicamento es obligatorio' })
  medication: string;

  @ApiProperty({ example: '400mg', description: 'Dosis' })
  @IsString()
  @IsNotEmpty({ message: 'La dosis es obligatoria' })
  dosage: string;

  @ApiProperty({ example: 'Cada 8 horas', description: 'Frecuencia' })
  @IsString()
  @IsNotEmpty({ message: 'La frecuencia es obligatoria' })
  frequency: string;

  @ApiProperty({ example: 'Por 5 días', description: 'Duración' })
  @IsString()
  @IsNotEmpty({ message: 'La duración es obligatoria' })
  duration: string;

  @ApiPropertyOptional({
    example: 'Tomar después de comer',
    description: 'Notas adicionales',
  })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class CreatePrescriptionDto {
  @ApiProperty({ example: 1, description: 'ID de la cita médica' })
  @Type(() => Number)
  @IsInt()
  @IsNotEmpty({ message: 'El appointmentId es obligatorio' })
  appointmentId: number;

  @ApiPropertyOptional({
    example: 'Reposo absoluto por 3 días',
    description: 'Indicaciones generales',
  })
  @IsString()
  @IsOptional()
  instructions?: string;

  @ApiPropertyOptional({
    example: '2026-03-15',
    description: 'Fecha de validez',
  })
  @IsDateString()
  @IsOptional()
  validUntil?: string;

  @ApiProperty({
    type: [PrescriptionItemDto],
    description: 'Lista de medicamentos',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1, { message: 'Debe incluir al menos un medicamento' })
  @Type(() => PrescriptionItemDto)
  items: PrescriptionItemDto[];
}
