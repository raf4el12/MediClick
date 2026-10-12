import { z } from 'zod';

const positiveInt = z.coerce.number().int().positive();

/** Entero positivo de la URL; cualquier otra cosa se ignora. */
export const readId = (value: string | string[] | undefined): number | undefined => {
  const parsed = positiveInt.safeParse(Array.isArray(value) ? value[0] : value);
  return parsed.success ? parsed.data : undefined;
};

export const readText = (value: string | string[] | undefined): string | undefined => {
  const text = (Array.isArray(value) ? value[0] : value)?.trim();
  return text ? text.slice(0, 80) : undefined;
};
