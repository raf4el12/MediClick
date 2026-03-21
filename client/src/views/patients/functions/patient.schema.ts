import { z } from 'zod';
import { isValidPhoneNumber } from 'libphonenumber-js';

const DNI_REGEX = /^\d{8}$/;
const DOC_GENERAL_REGEX = /^[a-zA-Z0-9]{1,12}$/;

export const patientSchema = z
  .object({
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
    phone: z
      .string()
      .refine((v) => !v || isValidPhoneNumber(v), 'Número de teléfono inválido')
      .optional()
      .or(z.literal('')),
    birthday: z.string().optional().or(z.literal('')),
    gender: z.string().optional().or(z.literal('')),
    typeDocument: z.enum(['DNI', 'CE', 'PASAPORTE'], {
      error: 'Seleccione un tipo de documento',
    }),
    numberDocument: z
      .string()
      .min(1, 'El número de documento es obligatorio'),
    emergencyContact: z
      .string()
      .min(1, 'El contacto de emergencia es obligatorio')
      .refine(isValidPhoneNumber, 'Número de teléfono inválido'),
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
  })
  .refine(
    (data) => {
      if (data.typeDocument === 'DNI') return DNI_REGEX.test(data.numberDocument);
      return DOC_GENERAL_REGEX.test(data.numberDocument);
    },
    {
      message: 'Número de documento inválido (DNI: 8 dígitos, CE/Pasaporte: máx. 12 caracteres)',
      path: ['numberDocument'],
    },
  );

export type PatientFormValues = z.infer<typeof patientSchema>;
