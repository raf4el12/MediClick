import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PrescriptionItemResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  medication: string;

  @ApiProperty()
  dosage: string;

  @ApiProperty()
  frequency: string;

  @ApiProperty()
  duration: string;

  @ApiPropertyOptional()
  notes: string | null;
}

export class PrescriptionDoctorDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  name: string;

  @ApiProperty()
  lastName: string;
}

export class PrescriptionPatientDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  name: string;

  @ApiProperty()
  lastName: string;
}

export class PrescriptionResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  appointmentId: number;

  @ApiPropertyOptional()
  instructions: string | null;

  @ApiPropertyOptional()
  validUntil: Date | null;

  @ApiProperty({ type: [PrescriptionItemResponseDto] })
  items: PrescriptionItemResponseDto[];

  @ApiProperty({ type: PrescriptionPatientDto })
  patient: PrescriptionPatientDto;

  @ApiProperty({ type: PrescriptionDoctorDto })
  doctor: PrescriptionDoctorDto;

  @ApiProperty()
  specialtyName: string;

  @ApiProperty()
  scheduleDate: Date;

  @ApiProperty({
    example: 'COMPLETED',
    description: 'Estado de la cita (auto-completado)',
  })
  appointmentStatus: string;

  @ApiProperty()
  createdAt: Date;
}
