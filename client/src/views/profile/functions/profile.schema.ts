import { z } from 'zod';

export const profileSchema = z.object({
  name: z
    .string()
    .min(1, 'El nombre es obligatorio')
    .max(100, 'El nombre no debe exceder 100 caracteres'),
  lastName: z
    .string()
    .min(1, 'El apellido es obligatorio')
    .max(100, 'El apellido no debe exceder 100 caracteres'),
  phone: z.string().optional().or(z.literal('')),
  typeDocument: z.string().optional().or(z.literal('')),
  numberDocument: z.string().optional().or(z.literal('')),
  address: z.string().max(255, 'La dirección no debe exceder 255 caracteres').optional().or(z.literal('')),
  state: z.string().max(100, 'El estado/departamento no debe exceder 100 caracteres').optional().or(z.literal('')),
  country: z.string().max(100, 'El país no debe exceder 100 caracteres').optional().or(z.literal('')),
});

export type ProfileFormValues = z.infer<typeof profileSchema>;
