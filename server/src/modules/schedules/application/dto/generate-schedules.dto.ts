import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class GenerateSchedulesDto {
  @ApiPropertyOptional({
    example: 1,
    description: 'ID del doctor (null = todos los doctores)',
  })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  doctorId?: number;

  @ApiProperty({ example: 3, description: 'Mes (1-12)' })
  @Type(() => Number)
  @IsInt()
  @IsNotEmpty({ message: 'El mes es obligatorio' })
  month: number;

  @ApiProperty({ example: 2026, description: 'Año' })
  @Type(() => Number)
  @IsInt()
  @IsNotEmpty({ message: 'El año es obligatorio' })
  year: number;
}
