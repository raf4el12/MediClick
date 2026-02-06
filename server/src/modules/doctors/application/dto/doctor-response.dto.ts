import { ApiProperty } from '@nestjs/swagger';

export class DoctorResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  licenseNumber: string;

  @ApiProperty()
  resume: string | null;

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
