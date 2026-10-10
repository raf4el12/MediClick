import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Matches, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class AgendaQueryDto {
  @ApiPropertyOptional({
    example: 12,
    description:
      'Agenda de un médico (máximo 42 días). Excluyente con clinicId; el médico puede omitirlo',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  doctorId?: number;

  @ApiPropertyOptional({
    example: 3,
    description:
      'Agenda de una sede (máximo 7 días). Excluyente con doctorId; el personal de sede puede omitirlo',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  clinicId?: number;

  @ApiProperty({
    example: '2026-10-05',
    description: 'Primer día local de la sede (YYYY-MM-DD), inclusive',
  })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'from debe tener formato YYYY-MM-DD',
  })
  from: string;

  @ApiProperty({
    example: '2026-10-11',
    description: 'Último día local de la sede (YYYY-MM-DD), inclusive',
  })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'to debe tener formato YYYY-MM-DD',
  })
  to: string;
}
