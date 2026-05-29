import { z } from 'zod';
import { WaitlistTimePreference } from '../types';

export const joinWaitlistSchema = z
  .object({
    specialtyId: z.number({ error: 'La especialidad es obligatoria' }),
    doctorId: z.number().optional(),
    dateFrom: z.string().min(1, 'La fecha de inicio es obligatoria'),
    dateTo: z.string().min(1, 'La fecha de fin es obligatoria'),
    timePreference: z.enum(WaitlistTimePreference).optional(),
    notes: z.string().max(300, 'Máximo 300 caracteres').optional().or(z.literal('')),
  })
  .refine((data) => data.dateTo >= data.dateFrom, {
    message: 'La fecha de fin no puede ser anterior a la de inicio',
    path: ['dateTo'],
  });

export type JoinWaitlistFormValues = z.infer<typeof joinWaitlistSchema>;

export const TIME_PREFERENCE_LABELS: Record<WaitlistTimePreference, string> = {
  [WaitlistTimePreference.ANY]: 'Cualquier horario',
  [WaitlistTimePreference.MORNING]: 'Mañana (antes de 12:00)',
  [WaitlistTimePreference.AFTERNOON]: 'Tarde (12:00 - 17:00)',
  [WaitlistTimePreference.EVENING]: 'Noche (después de 17:00)',
};
