import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PatientProfileDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  name: string;

  @ApiProperty()
  lastName: string;

  @ApiProperty()
  email: string;

  @ApiPropertyOptional()
  phone: string | null;

  @ApiPropertyOptional()
  birthday: Date | null;

  @ApiPropertyOptional()
  gender: string | null;

  @ApiPropertyOptional()
  typeDocument: string | null;

  @ApiPropertyOptional()
  numberDocument: string | null;
}

export class PatientResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  emergencyContact: string;

  @ApiProperty()
  bloodType: string;

  @ApiPropertyOptional()
  allergies: string | null;

  @ApiPropertyOptional()
  chronicConditions: string | null;

  @ApiProperty({ type: PatientProfileDto })
  profile: PatientProfileDto;

  @ApiProperty()
  createdAt: Date;
}
