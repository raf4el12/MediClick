import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ReviewRatingDistributionDto {
  @ApiProperty({ example: 2 })
  1: number;

  @ApiProperty({ example: 3 })
  2: number;

  @ApiProperty({ example: 5 })
  3: number;

  @ApiProperty({ example: 12 })
  4: number;

  @ApiProperty({ example: 40 })
  5: number;
}

export class ReviewStatsResponseDto {
  @ApiProperty({ example: 65, description: 'Reseñas visibles y ocultas' })
  total: number;

  @ApiProperty({ example: 62 })
  visible: number;

  @ApiProperty({ example: 3 })
  hidden: number;

  @ApiPropertyOptional({
    example: 4.6,
    description: 'Promedio de las visibles, con un decimal (null si no hay)',
  })
  averageRating: number | null;

  @ApiProperty({
    type: ReviewRatingDistributionDto,
    description: 'Reseñas visibles por calificación',
  })
  distribution: ReviewRatingDistributionDto;
}
