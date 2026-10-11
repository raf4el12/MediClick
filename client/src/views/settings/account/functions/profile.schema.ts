import { z } from 'zod';
import { isValidPhoneNumber } from 'libphonenumber-js';

const DNI_REGEX = /^\d{8}$/;
const DOC_GENERAL_REGEX = /^[a-zA-Z0-9]{1,12}$/;

const DOC_TYPES = ['DNI', 'CE', 'PASAPORTE'] as const;

export const profileSchema = z
  .object({
    name: z
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
    typeDocument: z.enum(DOC_TYPES, {
      error: 'Seleccione un tipo de documento',
    }).optional().or(z.literal('')),
    numberDocument: z.string().optional().or(z.literal('')),
    address: z
      .string()
      .max(255, 'La dirección no debe exceder 255 caracteres')
      .optional()
      .or(z.literal('')),
    state: z
      .string()
      .max(100, 'El departamento no debe exceder 100 caracteres')
      .optional()
      .or(z.literal('')),
    country: z
      .string()
      .max(100, 'El país no debe exceder 100 caracteres')
      .optional()
      .or(z.literal('')),
  })
  .refine(
    (data) => {
      if (!data.typeDocument || !data.numberDocument) return true;
      if (data.typeDocument === 'DNI') return DNI_REGEX.test(data.numberDocument);
      return DOC_GENERAL_REGEX.test(data.numberDocument);
    },
    {
      message: 'Número de documento inválido (DNI: 8 dígitos, CE/Pasaporte: máx. 12 caracteres)',
      path: ['numberDocument'],
    },
  );

export type ProfileFormValues = z.infer<typeof profileSchema>;
