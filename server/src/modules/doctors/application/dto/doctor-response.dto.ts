import { ApiProperty } from '@nestjs/swagger';

export class DoctorResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  licenseNumber: string;

  @ApiProperty()
  resume: string | null;

  @ApiProperty({ example: 2, description: 'Máximo de sobrecupos por día' })
  maxOverbookPerDay: number;

  @ApiProperty({ example: 1, nullable: true, description: 'ID de la sede' })
  clinicId: number | null;

  @ApiProperty({ nullable: true })
  clinic: { id: number; name: string; timezone: string; currency: string } | null;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  profile: {
    id: number;
    name: string;
    lastName: string;
    email: string;
    phone: string | null;
    gender: string | null;
  };

  @ApiProperty()
  user: {
    id: number;
    name: string;
    email: string;
  } | null;

  @ApiProperty()
  specialties: Array<{ id: number; name: string }>;
}
