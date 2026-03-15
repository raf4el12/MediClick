import { z } from 'zod';

export const scheduleBlockSchema = z
  .object({
    doctorId: z.number({ error: 'Selecciona un doctor' }).positive(),
    type: z.enum(['FULL_DAY', 'TIME_RANGE'], { error: 'Selecciona el tipo de bloqueo' }),
    startDate: z
      .string({ error: 'La fecha de inicio es obligatoria' })
      .min(1, 'La fecha de inicio es obligatoria'),
    endDate: z
      .string({ error: 'La fecha de fin es obligatoria' })
      .min(1, 'La fecha de fin es obligatoria'),
    timeFrom: z.string().optional(),
    timeTo: z.string().optional(),
    reason: z
      .string({ error: 'El motivo es obligatorio' })
      .min(1, 'El motivo es obligatorio')
      .max(500, 'Máximo 500 caracteres'),
  })
  .refine(
    (data) => {
      if (data.type === 'TIME_RANGE') {
        return !!data.timeFrom && !!data.timeTo;
      }
      return true;
    },
    {
      message: 'Las horas de inicio y fin son obligatorias para bloqueo por rango horario',
      path: ['timeFrom'],
    },
  );

export type ScheduleBlockFormValues = z.infer<typeof scheduleBlockSchema>;
