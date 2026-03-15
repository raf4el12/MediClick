import { ApiProperty } from '@nestjs/swagger';

export class ScheduleBlockDoctorDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Juan' })
  name: string;

  @ApiProperty({ example: 'Pérez' })
  lastName: string;
}

export class ScheduleBlockResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 1 })
  doctorId: number;

  @ApiProperty({ example: 'FULL_DAY' })
  type: string;

  @ApiProperty({ example: '2026-03-20T00:00:00.000Z' })
  startDate: Date;

  @ApiProperty({ example: '2026-03-22T00:00:00.000Z' })
  endDate: Date;

  @ApiProperty({ example: '08:00', nullable: true })
  timeFrom: string | null;

  @ApiProperty({ example: '12:00', nullable: true })
  timeTo: string | null;

  @ApiProperty({ example: 'Vacaciones del doctor' })
  reason: string;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty({ type: ScheduleBlockDoctorDto })
  doctor: ScheduleBlockDoctorDto;
}
