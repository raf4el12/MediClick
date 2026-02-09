import { z } from 'zod';

export const specialtySchema = z.object({
  categoryId: z
    .number({ error: 'La categoría es obligatoria' })
    .int()
    .positive('Seleccione una categoría'),
  name: z
    .string()
    .min(1, 'El nombre es obligatorio')
    .max(100, 'El nombre no debe exceder 100 caracteres'),
  description: z
    .string()
    .max(500, 'La descripción no debe exceder 500 caracteres')
    .optional()
    .or(z.literal('')),
  duration: z
    .number({ error: 'La duración es obligatoria' })
    .int('La duración debe ser un número entero')
    .min(1, 'La duración debe ser al menos 1 minuto'),
  price: z
    .number({ error: 'El precio es obligatorio' })
    .min(0, 'El precio no puede ser negativo'),
  requirements: z
    .string()
    .max(500, 'Los requisitos no deben exceder 500 caracteres')
    .optional()
    .or(z.literal('')),
  icon: z.string().optional().or(z.literal('')),
});

export type SpecialtyFormValues = z.infer<typeof specialtySchema>;
