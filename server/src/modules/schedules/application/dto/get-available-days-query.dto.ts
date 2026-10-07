import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsString, Matches } from 'class-validator';
import { Type } from 'class-transformer';

export class GetAvailableDaysQueryDto {
  @ApiProperty({ example: 3, description: 'ID del médico' })
  @Type(() => Number)
  @IsInt()
  @IsNotEmpty({ message: 'El doctorId es obligatorio' })
  doctorId: number;

  @ApiProperty({ example: 1, description: 'ID de la especialidad' })
  @Type(() => Number)
  @IsInt()
  @IsNotEmpty({ message: 'El specialtyId es obligatorio' })
  specialtyId: number;

  @ApiProperty({
    example: '2026-10-01',
    description:
      'Primer día local de la sede del médico (YYYY-MM-DD), inclusive',
  })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'dateFrom debe tener formato YYYY-MM-DD',
  })
  dateFrom: string;

  @ApiProperty({
    example: '2026-10-31',
    description:
      'Último día local de la sede del médico (YYYY-MM-DD), inclusive; máximo 62 días',
  })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'dateTo debe tener formato YYYY-MM-DD',
  })
  dateTo: string;
}
