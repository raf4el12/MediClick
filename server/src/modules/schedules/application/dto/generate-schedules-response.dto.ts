import { ApiProperty } from '@nestjs/swagger';

export class GenerateSchedulesResponseDto {
  @ApiProperty({ example: 42, description: 'Total de horarios generados' })
  generated: number;

  @ApiProperty({
    example: 3,
    description: 'Total de horarios omitidos por duplicado',
  })
  skipped: number;

  @ApiProperty({ example: 'Generación completada: 42 creados, 3 omitidos' })
  message: string;
}
