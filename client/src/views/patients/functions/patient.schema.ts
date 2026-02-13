import { z } from 'zod';

export const patientSchema = z.object({
  name: z
    .string()
    .min(1, 'El nombre es obligatorio')
    .max(100, 'El nombre no debe exceder 100 caracteres'),
  lastName: z
    .string()
    .min(1, 'El apellido es obligatorio')
    .max(100, 'El apellido no debe exceder 100 caracteres'),
  email: z
    .string()
    .min(1, 'El email es obligatorio')
    .email('El email debe tener un formato válido'),
  phone: z.string().optional().or(z.literal('')),
  birthday: z.string().optional().or(z.literal('')),
  gender: z.string().optional().or(z.literal('')),
  typeDocument: z.string().optional().or(z.literal('')),
  numberDocument: z.string().optional().or(z.literal('')),
  emergencyContact: z
    .string()
    .min(1, 'El contacto de emergencia es obligatorio'),
  bloodType: z
    .string()
    .min(1, 'El tipo de sangre es obligatorio'),
  allergies: z
    .string()
    .max(500, 'Las alergias no deben exceder 500 caracteres')
    .optional()
    .or(z.literal('')),
  chronicConditions: z
    .string()
    .max(500, 'Las condiciones crónicas no deben exceder 500 caracteres')
    .optional()
    .or(z.literal('')),
});

export type PatientFormValues = z.infer<typeof patientSchema>;
