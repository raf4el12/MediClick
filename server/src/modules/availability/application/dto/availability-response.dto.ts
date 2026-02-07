import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DayOfWeek } from '../../../../shared/domain/enums/day-of-week.enum.js';
import { AvailabilityType } from '../../../../shared/domain/enums/availability-type.enum.js';

export class AvailabilityDoctorDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  name: string;

  @ApiProperty()
  lastName: string;
}

export class AvailabilitySpecialtyDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  name: string;
}

export class AvailabilityResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  doctorId: number;

  @ApiProperty()
  specialtyId: number;

  @ApiProperty()
  startDate: Date;

  @ApiProperty()
  endDate: Date;

  @ApiProperty({ enum: DayOfWeek })
  dayOfWeek: DayOfWeek;

  @ApiProperty({ example: '08:00' })
  timeFrom: string;

  @ApiProperty({ example: '14:00' })
  timeTo: string;

  @ApiProperty()
  isAvailable: boolean;

  @ApiProperty({ enum: AvailabilityType })
  type: AvailabilityType;

  @ApiPropertyOptional()
  reason: string | null;

  @ApiProperty({ type: AvailabilityDoctorDto })
  doctor: AvailabilityDoctorDto;

  @ApiProperty({ type: AvailabilitySpecialtyDto })
  specialty: AvailabilitySpecialtyDto;

  @ApiProperty()
  createdAt: Date;
}
