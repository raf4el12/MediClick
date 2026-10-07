import { ApiProperty } from '@nestjs/swagger';

export class AvailableDayDto {
  @ApiProperty({ example: '2026-10-02' })
  date: string;

  @ApiProperty({ example: 7, description: 'Cupos libres ese día' })
  availableCount: number;
}

export class AvailableDaysResponseDto {
  @ApiProperty({ example: 3 })
  doctorId: number;

  @ApiProperty({ example: 1 })
  specialtyId: number;

  @ApiProperty({
    example: 'America/Lima',
    description: 'Zona horaria de la sede del médico',
  })
  timezone: string;

  @ApiProperty({
    type: [AvailableDayDto],
    description: 'Solo días con al menos un cupo libre, en orden ascendente',
  })
  days: AvailableDayDto[];
}
