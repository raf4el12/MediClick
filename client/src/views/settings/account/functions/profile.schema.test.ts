import { describe, expect, it } from 'vitest';
import { profileSchema } from './profile.schema';

const valid = {
  name: 'Ana',
  lastName: 'Paciente',
  phone: '+51987654321',
  typeDocument: 'DNI' as const,
  numberDocument: '12345678',
  address: 'Av. Larco 1150',
  state: 'Lima',
  country: 'Perú',
};

const errorsOf = (data: unknown) => {
  const result = profileSchema.safeParse(data);
  return result.success ? {} : Object.fromEntries(result.error.issues.map((i) => [i.path.join('.'), i.message]));
};

describe('profileSchema', () => {
  it('acepta un perfil completo y válido', () => {
    expect(profileSchema.safeParse(valid).success).toBe(true);
  });

  it('acepta los campos opcionales vacíos', () => {
    const empty = { name: 'Ana', lastName: 'Paciente', phone: '', typeDocument: '', numberDocument: '', address: '', state: '', country: '' };

    expect(profileSchema.safeParse(empty).success).toBe(true);
  });

  it('rechaza un teléfono internacional inválido', () => {
    expect(errorsOf({ ...valid, phone: '+51123' })).toEqual({ phone: 'Número de teléfono inválido' });
  });

  it('exige nombre y apellido', () => {
    expect(errorsOf({ ...valid, name: '', lastName: '' })).toEqual({
      name: 'El nombre es obligatorio',
      lastName: 'El apellido es obligatorio',
    });
  });

  it('valida el número según el tipo de documento', () => {
    const message = 'Número de documento inválido (DNI: 8 dígitos, CE/Pasaporte: máx. 12 caracteres)';

    expect(errorsOf({ ...valid, numberDocument: '1234567' })).toEqual({ numberDocument: message });
    expect(errorsOf({ ...valid, typeDocument: 'PASAPORTE', numberDocument: 'AB-123' })).toEqual({ numberDocument: message });
    expect(profileSchema.safeParse({ ...valid, typeDocument: 'CE', numberDocument: 'X12345678' }).success).toBe(true);
  });
});
