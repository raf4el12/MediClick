import { describe, expect, it } from 'vitest';
import { REGISTER_STEPS, registerSchema, type RegisterFormValues } from './register.schema';

const valid: RegisterFormValues = {
  typeDocument: 'DNI',
  numberDocument: '45678912',
  name: 'Ana',
  lastName: 'Torres',
  email: 'ana.torres@test.local',
  phone: '+51987654321',
  birthday: '1990-05-12',
  gender: 'F',
  emergencyContact: '+51912345678',
  bloodType: 'O+',
  allergies: '',
  chronicConditions: '',
  password: 'Secreta123',
  confirmPassword: 'Secreta123',
};

/** Mensajes de error del campo para un valor dado. */
const errorsFor = (patch: Partial<RegisterFormValues>, field: keyof RegisterFormValues) => {
  const result = registerSchema.safeParse({ ...valid, ...patch });
  return result.success ? [] : result.error.issues.filter((i) => i.path[0] === field).map((i) => i.message);
};

describe('registerSchema', () => {
  it('acepta un registro completo y válido', () => {
    expect(registerSchema.safeParse(valid).success).toBe(true);
  });

  it('la contraseña exige 8 caracteres, una mayúscula y un número', () => {
    expect(errorsFor({ password: 'Sec12', confirmPassword: 'Sec12' }, 'password')).toContain('La contraseña debe tener al menos 8 caracteres');
    expect(errorsFor({ password: 'secreta123', confirmPassword: 'secreta123' }, 'password')).toContain('Debe incluir al menos una letra mayúscula');
    expect(errorsFor({ password: 'Secretaabc', confirmPassword: 'Secretaabc' }, 'password')).toContain('Debe incluir al menos un número');
  });

  it('una confirmación distinta marca el error en confirmPassword', () => {
    expect(errorsFor({ confirmPassword: 'Otra12345' }, 'confirmPassword')).toEqual(['Las contraseñas no coinciden']);
  });

  it('rechaza teléfono y contacto de emergencia inválidos', () => {
    expect(errorsFor({ phone: '+51123' }, 'phone')).toEqual(['Número de teléfono inválido']);
    expect(errorsFor({ emergencyContact: '12' }, 'emergencyContact')).toEqual(['Número de teléfono inválido']);
  });

  it('las alergias admiten hasta 500 caracteres', () => {
    expect(errorsFor({ allergies: 'a'.repeat(500) }, 'allergies')).toEqual([]);
    expect(errorsFor({ allergies: 'a'.repeat(501) }, 'allergies')).toEqual(['Máximo 500 caracteres']);
  });

  it('cada campo del esquema pertenece exactamente a un paso', () => {
    const fields = REGISTER_STEPS.flatMap((step) => step.fields);
    expect(new Set(fields).size).toBe(fields.length);
    expect([...fields].sort()).toEqual(Object.keys(registerSchema.shape).sort());
  });
});
