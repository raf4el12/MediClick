import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateMedicalHistoryDto {
  @ApiPropertyOptional({
    example: 'Diabetes Tipo 2 - Controlada',
    description: 'Condición o diagnóstico',
  })
  @IsString()
  @MaxLength(255, { message: 'La condición no debe exceder 255 caracteres' })
  @IsOptional()
  condition?: string;

  @ApiPropertyOptional({
    example: 'Descripción actualizada.',
    description: 'Descripción detallada',
  })
  @IsString()
  @MaxLength(2000, { message: 'La descripción no debe exceder 2000 caracteres' })
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
    example: 'Notas actualizadas',
    description: 'Notas adicionales',
  })
  @IsString()
  @MaxLength(2000, { message: 'Las notas no deben exceder 2000 caracteres' })
  @IsOptional()
  notes?: string;
}
