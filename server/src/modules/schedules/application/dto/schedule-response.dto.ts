import { ApiProperty } from '@nestjs/swagger';

export class ScheduleDoctorDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  name: string;

  @ApiProperty()
  lastName: string;
}

export class ScheduleSpecialtyDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  name: string;
}

export class ScheduleResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  doctorId: number;

  @ApiProperty()
  specialtyId: number;

  @ApiProperty({ example: '2026-03-10' })
  scheduleDate: Date;

  @ApiProperty({ example: '08:00' })
  timeFrom: string;

  @ApiProperty({ example: '14:00' })
  timeTo: string;

  @ApiProperty({ type: ScheduleDoctorDto })
  doctor: ScheduleDoctorDto;

  @ApiProperty({ type: ScheduleSpecialtyDto })
  specialty: ScheduleSpecialtyDto;

  @ApiProperty()
  createdAt: Date;
}
