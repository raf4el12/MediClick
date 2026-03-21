import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString } from 'class-validator';

export class UpdateMedicalHistoryDto {
  @ApiPropertyOptional({
    example: 'Diabetes Tipo 2 - Controlada',
    description: 'Condición o diagnóstico',
  })
  @IsString()
  @IsOptional()
  condition?: string;

  @ApiPropertyOptional({
    example: 'Descripción actualizada.',
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
    example: 'Notas actualizadas',
    description: 'Notas adicionales',
  })
  @IsString()
  @IsOptional()
  notes?: string;
}
