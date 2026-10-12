'use client';

import Rating, { type RatingProps } from '@mui/material/Rating';

/** Calificación de solo lectura con nombre accesible en español; usable desde componentes de servidor. */
export default function ReadOnlyRating({ value, size = 'small' }: { value: number; size?: RatingProps['size'] }) {
  return <Rating value={value} readOnly size={size} getLabelText={(v) => `${v} de 5 estrellas`} />;
}
