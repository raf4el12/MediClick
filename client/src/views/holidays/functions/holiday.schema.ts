import { z } from 'zod';

export const holidaySchema = z.object({
  name: z
    .string({ error: 'El nombre es obligatorio' })
    .min(1, 'El nombre es obligatorio')
    .max(255, 'Máximo 255 caracteres'),
  date: z
    .string({ error: 'La fecha es obligatoria' })
    .min(1, 'La fecha es obligatoria')
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido (YYYY-MM-DD)')
    .refine((val) => {
      const d = new Date(val);
      return !isNaN(d.getTime());
    }, 'La fecha ingresada no es válida'),
  isRecurring: z.boolean({ error: 'Debe indicar si es recurrente' }),
});

export type HolidayFormValues = z.infer<typeof holidaySchema>;
