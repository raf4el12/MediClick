import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ClinicalNotePatientDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  name: string;

  @ApiProperty()
  lastName: string;
}

export class ClinicalNoteResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  appointmentId: number;

  @ApiPropertyOptional()
  summary: string | null;

  @ApiPropertyOptional()
  diagnosis: string | null;

  @ApiPropertyOptional()
  plan: string | null;

  @ApiProperty({ type: ClinicalNotePatientDto })
  patient: ClinicalNotePatientDto;

  @ApiProperty()
  scheduleDate: Date;

  @ApiProperty()
  createdAt: Date;
}
