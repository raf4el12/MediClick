import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { PublicPageQueryDto } from './public-page-query.dto.js';

export class ListPublicDoctorsQueryDto extends PublicPageQueryDto {
  @ApiPropertyOptional({ example: 7, description: 'Filtrar por sede' })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  clinicId?: number;

  @ApiPropertyOptional({ example: 1, description: 'Filtrar por especialidad' })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  specialtyId?: number;

  @ApiPropertyOptional({ example: 'greg', description: 'Nombre o apellido' })
  @IsString()
  @MaxLength(80)
  @IsOptional()
  searchValue?: string;
}
