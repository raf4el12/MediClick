import { z } from 'zod';
import { isValidPhoneNumber } from 'libphonenumber-js';

export const DOCUMENT_TYPES = [
  { value: 'DNI', label: 'DNI' },
  { value: 'CE', label: 'Carné de Extranjería' },
  { value: 'PASAPORTE', label: 'Pasaporte' },
];

export const GENDER_OPTIONS = [
  { value: 'M', label: 'Masculino' },
  { value: 'F', label: 'Femenino' },
];

export const BLOOD_TYPE_OPTIONS = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];

export const registerSchema = z
  .object({
    typeDocument: z.string().min(1, 'Selecciona un tipo de documento'),
    numberDocument: z
      .string()
      .min(1, 'El número de documento es obligatorio')
      .max(20, 'Máximo 20 caracteres'),
    name: z
      .string()
      .min(1, 'El nombre es obligatorio')
      .max(100, 'Máximo 100 caracteres'),
    lastName: z
      .string()
      .min(1, 'El apellido es obligatorio')
      .max(100, 'Máximo 100 caracteres'),
    email: z
      .string()
      .min(1, 'El email es obligatorio')
      .email('Formato de email inválido'),
    phone: z
      .string()
      .min(1, 'El teléfono es obligatorio')
      .refine(isValidPhoneNumber, 'Número de teléfono inválido'),
    birthday: z.string().optional(),
    gender: z.string().optional(),
    emergencyContact: z
      .string()
      .min(1, 'El contacto de emergencia es obligatorio')
      .refine(isValidPhoneNumber, 'Número de teléfono inválido'),
    bloodType: z.string().min(1, 'El tipo de sangre es obligatorio'),
    allergies: z.string().max(500, 'Máximo 500 caracteres').optional().or(z.literal('')),
    chronicConditions: z.string().max(500, 'Máximo 500 caracteres').optional().or(z.literal('')),
    password: z
      .string()
      .min(8, 'La contraseña debe tener al menos 8 caracteres')
      .regex(/(?=.*[a-z])/, 'Debe incluir al menos una letra minúscula')
      .regex(/(?=.*[A-Z])/, 'Debe incluir al menos una letra mayúscula')
      .regex(/(?=.*\d)/, 'Debe incluir al menos un número'),
    confirmPassword: z.string().min(1, 'Confirma tu contraseña'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  });

export type RegisterFormValues = z.infer<typeof registerSchema>;

/** Pasos del registro: cada campo del esquema se pide y se valida en exactamente uno. */
export const REGISTER_STEPS: { title: string; subtitle: string; fields: (keyof RegisterFormValues)[] }[] = [
  { title: 'Identificación', subtitle: 'Tu documento', fields: ['typeDocument', 'numberDocument'] },
  { title: 'Datos personales', subtitle: 'Nombre y contacto', fields: ['name', 'lastName', 'email', 'phone', 'birthday', 'gender'] },
  { title: 'Información médica', subtitle: 'Para tu atención', fields: ['emergencyContact', 'bloodType', 'allergies', 'chronicConditions'] },
  { title: 'Credenciales', subtitle: 'Tu contraseña', fields: ['password', 'confirmPassword'] },
];
