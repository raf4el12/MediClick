import { z } from 'zod';

export const medicalHistorySchema = z.object({
  patientId: z.number({ error: 'El paciente es requerido' }).int().positive(),
  condition: z
    .string({ error: 'La condición es requerida' })
    .min(1, 'La condición es requerida')
    .max(255, 'Máximo 255 caracteres'),
  description: z.string().max(1000, 'Máximo 1000 caracteres').optional().or(z.literal('')),
  diagnosedDate: z.string().optional().or(z.literal('')),
  status: z.enum(['ACTIVE', 'RESOLVED', 'CHRONIC']).optional(),
  notes: z.string().max(1000, 'Máximo 1000 caracteres').optional().or(z.literal('')),
});

export type MedicalHistoryFormValues = z.infer<typeof medicalHistorySchema>;
