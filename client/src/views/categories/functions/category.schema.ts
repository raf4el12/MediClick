import { z } from 'zod';

export const categorySchema = z.object({
  name: z
    .string()
    .min(1, 'El nombre es obligatorio')
    .max(100, 'El nombre no debe exceder 100 caracteres'),
  description: z
    .string()
    .max(500, 'La descripción no debe exceder 500 caracteres')
    .optional()
    .or(z.literal('')),
  icon: z.string().optional().or(z.literal('')),
  color: z.string().optional().or(z.literal('')),
  order: z
    .number()
    .int('El orden debe ser un número entero')
    .min(0, 'El orden no puede ser negativo')
    .optional(),
});

export type CategoryFormValues = z.infer<typeof categorySchema>;
