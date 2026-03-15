import { z } from 'zod';

const PHONE_REGEX = /^9\d{8}$/;
const DNI_REGEX = /^\d{8}$/;
const DOC_GENERAL_REGEX = /^[a-zA-Z0-9]{1,12}$/;

const ROLES = ['ADMIN', 'DOCTOR', 'RECEPTIONIST'] as const;
const DOC_TYPES = ['DNI', 'CE', 'PASAPORTE'] as const;

const documentValidation = (data: { typeDocument?: string; numberDocument?: string }) => {
  if (!data.typeDocument || !data.numberDocument) return true;
  if (data.typeDocument === 'DNI') return DNI_REGEX.test(data.numberDocument);
  return DOC_GENERAL_REGEX.test(data.numberDocument);
};

const documentErrorMessage = {
  message: 'Número de documento inválido (DNI: 8 dígitos, CE/Pasaporte: máx. 12 caracteres)',
  path: ['numberDocument'] as string[],
};

export const createUserSchema = z
  .object({
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
    role: z.enum(ROLES, {
      message: 'El rol es obligatorio',
    }),
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
      .regex(PHONE_REGEX, 'Debe ser un celular válido (9 dígitos, inicia con 9)')
      .optional()
      .or(z.literal('')),
    typeDocument: z.enum(DOC_TYPES, {
      error: 'Seleccione un tipo de documento',
    }).optional().or(z.literal('')),
    numberDocument: z.string().optional().or(z.literal('')),
  })
  .refine(documentValidation, documentErrorMessage);

export type CreateUserFormValues = z.infer<typeof createUserSchema>;

export const editUserSchema = z
  .object({
    role: z.enum(ROLES, {
      message: 'El rol es obligatorio',
    }),
    isActive: z.boolean(),
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
      .regex(PHONE_REGEX, 'Debe ser un celular válido (9 dígitos, inicia con 9)')
      .optional()
      .or(z.literal('')),
    typeDocument: z.enum(DOC_TYPES, {
      error: 'Seleccione un tipo de documento',
    }).optional().or(z.literal('')),
    numberDocument: z.string().optional().or(z.literal('')),
  })
  .refine(documentValidation, documentErrorMessage);

export type EditUserFormValues = z.infer<typeof editUserSchema>;
