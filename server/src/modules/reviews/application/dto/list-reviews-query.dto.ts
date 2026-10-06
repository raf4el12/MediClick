import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, Max, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class ListReviewsQueryDto {
  @ApiPropertyOptional({
    example: false,
    description: 'true = visibles, false = ocultas',
  })
  @Transform(({ value }) =>
    value === 'true' || value === true
      ? true
      : value === 'false' || value === false
        ? false
        : undefined,
  )
  @IsBoolean()
  @IsOptional()
  isVisible?: boolean;

  @ApiPropertyOptional({ example: 2, minimum: 1, maximum: 5 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  @IsOptional()
  rating?: number;

  @ApiPropertyOptional({ example: 3 })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  doctorId?: number;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  currentPage?: number;

  @ApiPropertyOptional({ example: 10, default: 10, maximum: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  pageSize?: number;
}
