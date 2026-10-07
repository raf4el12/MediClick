import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PublicSpecialtyDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Cardiología' })
  name: string;
}

export class PublicClinicDto {
  @ApiProperty({ example: 7 })
  id: number;

  @ApiProperty({ example: 'Sede Central' })
  name: string;

  @ApiPropertyOptional({ example: 'Av. Siempre Viva 742' })
  address: string | null;
}

export class PublicDoctorSummaryDto {
  @ApiProperty({ example: 3 })
  id: number;

  @ApiProperty({ example: 'Gregorio' })
  name: string;

  @ApiProperty({ example: 'Médico' })
  lastName: string;

  @ApiPropertyOptional()
  photo: string | null;

  @ApiProperty({ type: [PublicSpecialtyDto] })
  specialties: PublicSpecialtyDto[];

  @ApiProperty({ type: PublicClinicDto })
  clinic: PublicClinicDto;

  @ApiPropertyOptional({
    example: 4.5,
    description: 'Promedio de reseñas visibles',
  })
  ratingAvg: number | null;

  @ApiProperty({ example: 8, description: 'Cantidad de reseñas visibles' })
  ratingCount: number;
}

export class PublicDoctorDto extends PublicDoctorSummaryDto {
  @ApiPropertyOptional()
  resume: string | null;

  @ApiProperty({ example: 'CMP-12345' })
  licenseNumber: string;
}

export class PublicReviewDto {
  @ApiProperty({ example: 10 })
  id: number;

  @ApiProperty({ example: 5 })
  rating: number;

  @ApiPropertyOptional()
  comment: string | null;

  @ApiProperty()
  createdAt: Date;
}

export class PaginatedPublicDoctorsDto {
  @ApiProperty({ type: [PublicDoctorSummaryDto] })
  rows: PublicDoctorSummaryDto[];

  @ApiProperty({ example: 24 })
  totalRows: number;

  @ApiProperty({ example: 1 })
  currentPage: number;

  @ApiProperty({ example: 3 })
  totalPages: number;
}

export class PublicDoctorReviewsDto {
  @ApiProperty({ type: [PublicReviewDto] })
  rows: PublicReviewDto[];

  @ApiProperty({ example: 8 })
  totalRows: number;

  @ApiPropertyOptional({ example: 4.5 })
  ratingAvg: number | null;

  @ApiProperty({ example: 8 })
  ratingCount: number;
}
