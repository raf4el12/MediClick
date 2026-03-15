import { z } from 'zod';

export const holidaySchema = z.object({
  name: z
    .string({ error: 'El nombre es obligatorio' })
    .min(1, 'El nombre es obligatorio')
    .max(255, 'Máximo 255 caracteres'),
  date: z
    .string({ error: 'La fecha es obligatoria' })
    .min(1, 'La fecha es obligatoria'),
  isRecurring: z.boolean(),
});

export type HolidayFormValues = z.infer<typeof holidaySchema>;
