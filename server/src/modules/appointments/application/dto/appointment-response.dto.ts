import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AppointmentDoctorDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  name: string;

  @ApiProperty()
  lastName: string;
}

export class AppointmentSpecialtyDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  name: string;
}

export class AppointmentScheduleDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  scheduleDate: Date;

  @ApiProperty({ example: '08:00' })
  timeFrom: string;

  @ApiProperty({ example: '14:00' })
  timeTo: string;

  @ApiProperty({ type: AppointmentDoctorDto })
  doctor: AppointmentDoctorDto;

  @ApiProperty({ type: AppointmentSpecialtyDto })
  specialty: AppointmentSpecialtyDto;
}

export class AppointmentPatientDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  name: string;

  @ApiProperty()
  lastName: string;

  @ApiProperty()
  email: string;
}

export class AppointmentResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  patientId: number;

  @ApiProperty()
  scheduleId: number;

  @ApiProperty({ example: '08:20', description: 'Hora inicio del slot (HH:mm)' })
  startTime: string;

  @ApiProperty({ example: '08:40', description: 'Hora fin del slot (HH:mm)' })
  endTime: string;

  @ApiPropertyOptional()
  reason: string | null;

  @ApiPropertyOptional()
  notes: string | null;

  @ApiProperty({ example: 'PENDING' })
  status: string;

  @ApiProperty({ example: 'PENDING' })
  paymentStatus: string;

  @ApiPropertyOptional()
  amount: number | null;

  @ApiPropertyOptional()
  cancelReason: string | null;

  @ApiPropertyOptional({ example: 75.0, description: 'Penalización por cancelación tardía' })
  cancellationFee: number | null;

  @ApiProperty({ example: false, description: 'Indica si es una cita de sobrecupo' })
  isOverbook: boolean;

  @ApiProperty({ type: AppointmentPatientDto })
  patient: AppointmentPatientDto;

  @ApiProperty({ type: AppointmentScheduleDto })
  schedule: AppointmentScheduleDto;

  @ApiProperty({ example: 'America/Lima', description: 'IANA timezone de la sede del doctor' })
  timezone: string;

  @ApiProperty()
  createdAt: Date;
}
