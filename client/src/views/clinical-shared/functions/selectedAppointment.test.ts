import { describe, expect, it } from 'vitest';
import { parseAppointmentId } from './selectedAppointment';

describe('parseAppointmentId', () => {
  it('un número entero positivo es el id de la cita', () => {
    expect(parseAppointmentId('101')).toBe(101);
  });

  it('vacío, ausente, cero, negativo, decimal o no numérico no seleccionan ninguna cita', () => {
    expect(parseAppointmentId(null)).toBeNull();
    expect(parseAppointmentId('')).toBeNull();
    expect(parseAppointmentId('0')).toBeNull();
    expect(parseAppointmentId('-4')).toBeNull();
    expect(parseAppointmentId('2.5')).toBeNull();
    expect(parseAppointmentId('abc')).toBeNull();
    expect(parseAppointmentId('12abc')).toBeNull();
  });
});
