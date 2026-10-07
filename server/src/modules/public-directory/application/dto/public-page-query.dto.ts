import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export const PUBLIC_MAX_PAGE_SIZE = 50;

export class PublicPageQueryDto {
  @ApiPropertyOptional({ example: 1, default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  currentPage?: number;

  @ApiPropertyOptional({
    example: 10,
    default: 10,
    maximum: PUBLIC_MAX_PAGE_SIZE,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(PUBLIC_MAX_PAGE_SIZE)
  @IsOptional()
  pageSize?: number;
}

export function toPageRequest(query: PublicPageQueryDto) {
  const limit = query.pageSize ?? 10;
  return { offset: ((query.currentPage ?? 1) - 1) * limit, limit };
}
