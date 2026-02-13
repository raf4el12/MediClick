import { z } from 'zod';

const ROLES = ['ADMIN', 'DOCTOR', 'RECEPTIONIST'] as const;

export const createUserSchema = z.object({
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
  phone: z.string().optional().or(z.literal('')),
  typeDocument: z.string().optional().or(z.literal('')),
  numberDocument: z.string().optional().or(z.literal('')),
});

export type CreateUserFormValues = z.infer<typeof createUserSchema>;

export const editUserSchema = z.object({
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
  phone: z.string().optional().or(z.literal('')),
  typeDocument: z.string().optional().or(z.literal('')),
  numberDocument: z.string().optional().or(z.literal('')),
});

export type EditUserFormValues = z.infer<typeof editUserSchema>;
