import { z } from 'zod';

export const createAppointmentSchema = z.object({
  specialtyId: z.number({ error: 'La especialidad es obligatoria' }),
  doctorId: z.number({ error: 'El doctor es obligatorio' }),
  scheduleId: z.number({ error: 'El horario es obligatorio' }),
  patientId: z.number({ error: 'El paciente es obligatorio' }),
  reason: z.string().optional().or(z.literal('')),
});

export type CreateAppointmentFormValues = z.infer<typeof createAppointmentSchema>;

export const cancelAppointmentSchema = z.object({
  reason: z
    .string()
    .min(5, 'El motivo debe tener al menos 5 caracteres'),
});

export type CancelAppointmentFormValues = z.infer<typeof cancelAppointmentSchema>;
