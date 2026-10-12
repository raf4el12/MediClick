import { IsInt, IsString, IsOptional, IsIn } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export const ORDER_BY_MODES = ['asc', 'desc'] as const;
export type OrderByMode = (typeof ORDER_BY_MODES)[number];

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
    enum: ORDER_BY_MODES,
    description: 'Modo de ordenamiento (asc o desc)',
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.toLowerCase() : value,
  )
  @IsIn(ORDER_BY_MODES, { message: 'orderByMode debe ser asc o desc' })
  orderByMode?: OrderByMode;

  @ApiPropertyOptional({
    example: 5,
    description: 'Valor numérico opcional para filtros personalizados',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  custom_value?: number;
}
