import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';

/**
 * Lista blanca de columnas por las que un listado acepta `orderBy`. Se aplica
 * sobre la clase (no sobre la propiedad) para no redeclarar `orderBy` del
 * `PaginationDto` base. Un valor fuera de la lista responde 400 en vez de
 * llegar a Prisma como columna inexistente (500).
 */
export function SortableBy(fields: readonly string[]): ClassDecorator {
  const decorators = [
    ApiPropertyOptional({
      enum: fields,
      description: 'Columna por la que se ordena',
    }),
    IsOptional(),
    IsIn(fields, {
      message: `orderBy debe ser una de: ${fields.join(', ')}`,
    }),
  ];
  return (target) => {
    for (const decorate of decorators) {
      decorate(target.prototype as object, 'orderBy');
    }
  };
}
