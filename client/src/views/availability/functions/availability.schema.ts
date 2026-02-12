import { z } from 'zod';

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const availabilitySchema = z.object({
  doctorId: z
    .number({ error: 'El doctor es obligatorio' })
    .int()
    .positive('Seleccione un doctor'),
  specialtyId: z
    .number({ error: 'La especialidad es obligatoria' })
    .int()
    .positive('Seleccione una especialidad'),
  startDate: z
    .string()
    .min(1, 'La fecha de inicio es obligatoria'),
  endDate: z
    .string()
    .min(1, 'La fecha de fin es obligatoria'),
  dayOfWeek: z
    .string()
    .min(1, 'El día es obligatorio'),
  timeFrom: z
    .string()
    .regex(timeRegex, 'Formato inválido (HH:mm)'),
  timeTo: z
    .string()
    .regex(timeRegex, 'Formato inválido (HH:mm)'),
  type: z
    .string()
    .min(1, 'El tipo es obligatorio'),
  reason: z
    .string()
    .max(500, 'La razón no debe exceder 500 caracteres')
    .optional()
    .or(z.literal('')),
});

export type AvailabilityFormValues = z.infer<typeof availabilitySchema>;
