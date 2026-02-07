import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PatientResponseDto } from './patient-response.dto.js';

export class PatientAppointmentHistoryDto {
  @ApiProperty()
  id: number;

  @ApiPropertyOptional()
  reason: string | null;

  @ApiProperty()
  status: string;

  @ApiProperty()
  scheduleDate: Date;

  @ApiProperty()
  timeFrom: string;

  @ApiProperty()
  timeTo: string;

  @ApiProperty()
  doctorName: string;

  @ApiProperty()
  specialtyName: string;

  @ApiProperty()
  createdAt: Date;
}

export class PatientHistoryResponseDto extends PatientResponseDto {
  @ApiProperty({ type: [PatientAppointmentHistoryDto] })
  appointments: PatientAppointmentHistoryDto[];
}
