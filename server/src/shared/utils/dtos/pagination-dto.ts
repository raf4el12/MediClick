import { IsInt, IsString, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class PaginationDto {
  @ApiPropertyOptional({
    example: 'Settings',
    description: 'Texto a buscar en modules (por nombre, descripción, etc.)',
  })
  @IsOptional()
  @IsString()
  searchValue?: string;

  @ApiPropertyOptional({
    example: 1,
    description: 'Número de la página actual para la paginación',
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  currentPage?: number;

  @ApiPropertyOptional({
    example: 10,
    description: 'Cantidad de resultados por página',
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  pageSize?: number;

  @ApiPropertyOptional({
    example: 'name',
    description: 'Campo por el cual se quiere ordenar la búsqueda',
  })
  @IsOptional()
  @IsString()
  orderBy?: string;

  @ApiPropertyOptional({
    example: 'desc',
    description: 'Modo de ordenamiento (ASC o DESC)',
  })
  @IsOptional()
  @IsString()
  orderByMode?: string;

  @ApiPropertyOptional({
    example: 5,
    description: 'Valor numérico opcional para filtros personalizados',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  custom_value?: number;
}
