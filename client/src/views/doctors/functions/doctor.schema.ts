import { z } from 'zod';
import { isValidPhoneNumber } from 'libphonenumber-js';

const CMP_REGEX = /^\d{5,6}$/;

export const doctorSchema = z.object({
  userName: z
    .string()
    .min(1, 'El nombre de usuario es obligatorio')
    .max(100, 'El nombre no debe exceder 100 caracteres'),
  email: z
    .string()
    .min(1, 'El email es obligatorio')
    .email('El email debe tener un formato válido'),
  password: z
    .string()
    .min(6, 'La contraseña debe tener al menos 6 caracteres'),
  profileName: z
    .string()
    .min(1, 'El nombre es obligatorio')
    .max(100, 'El nombre no debe exceder 100 caracteres'),
  lastName: z
    .string()
    .min(1, 'El apellido es obligatorio')
    .max(100, 'El apellido no debe exceder 100 caracteres'),
  phone: z
    .string()
    .refine((v) => !v || isValidPhoneNumber(v), 'Número de teléfono inválido')
    .optional()
    .or(z.literal('')),
  gender: z.string().optional().or(z.literal('')),
  cmp: z
    .string()
    .min(1, 'El CMP es obligatorio')
    .regex(CMP_REGEX, 'El CMP debe tener 5 o 6 dígitos'),
  resume: z
    .string()
    .max(1000, 'El resumen no debe exceder 1000 caracteres')
    .optional()
    .or(z.literal('')),
  clinicId: z.number().int().optional(),
  specialtyIds: z
    .array(z.number().int())
    .min(1, 'Debe seleccionar al menos una especialidad'),
});

export type DoctorFormValues = z.infer<typeof doctorSchema>;
