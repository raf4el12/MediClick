import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ReviewPersonDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  name: string;

  @ApiProperty()
  lastName: string;
}

export class ReviewResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  appointmentId: number;

  @ApiProperty()
  doctorId: number;

  @ApiProperty()
  patientId: number;

  @ApiProperty({ example: 5 })
  rating: number;

  @ApiPropertyOptional()
  comment: string | null;

  @ApiProperty()
  isVisible: boolean;

  @ApiProperty({ type: ReviewPersonDto })
  patient: ReviewPersonDto;

  @ApiProperty({ type: ReviewPersonDto })
  doctor: ReviewPersonDto;

  @ApiProperty()
  createdAt: Date;
}

export class DoctorReviewsResponseDto {
  @ApiProperty()
  doctorId: number;

  @ApiPropertyOptional({
    example: 4.75,
    description: 'Promedio de reseñas visibles (null si no hay)',
  })
  ratingAvg: number | null;

  @ApiProperty({ example: 12, description: 'Nº de reseñas visibles' })
  ratingCount: number;

  @ApiProperty({ type: [ReviewResponseDto] })
  reviews: ReviewResponseDto[];
}
