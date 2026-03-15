import { ApiProperty } from '@nestjs/swagger';

export class HolidayResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Año Nuevo' })
  name: string;

  @ApiProperty({ example: '2026-01-01T00:00:00.000Z' })
  date: Date;

  @ApiProperty({ example: 2026 })
  year: number;

  @ApiProperty({ example: true })
  isRecurring: boolean;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;
}
