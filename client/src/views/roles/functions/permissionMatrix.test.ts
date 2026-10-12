import { describe, expect, it } from 'vitest';
import type { PermissionDto } from '../types';
import { fromPermissionMatrix, rowState, toPermissionMatrix, toggleAll, togglePermission, toggleSubject } from './permissionMatrix';

const perm = (id: number, action: string, subject: string): PermissionDto => ({ id, action, subject, description: null });

const permissions: PermissionDto[] = [
  perm(1, 'READ', 'PATIENTS'),
  perm(2, 'CREATE', 'PATIENTS'),
  perm(3, 'MANAGE', 'PATIENTS'),
  perm(4, 'READ', 'APPOINTMENTS'),
  perm(5, 'UPDATE', 'APPOINTMENTS'),
  perm(6, 'MANAGE', 'ALL'),
];

describe('toPermissionMatrix / fromPermissionMatrix', () => {
  it('la ida y vuelta conserva exactamente los ids elegidos', () => {
    const matrix = toPermissionMatrix(permissions, [5, 1, 3]);

    expect(fromPermissionMatrix(matrix).sort((a, b) => a - b)).toEqual([1, 3, 5]);
  });

  it('marcar el módulo completo marca todas sus acciones; con todas marcadas, las quita', () => {
    const marked = toggleSubject(toPermissionMatrix(permissions, [1]), 'PATIENTS');
    expect(fromPermissionMatrix(marked).sort((a, b) => a - b)).toEqual([1, 2, 3]);

    expect(fromPermissionMatrix(toggleSubject(marked, 'PATIENTS'))).toEqual([]);
  });

  it('marcar «Gestionar» de un módulo marca solo esa casilla, sin arrastrar las demás acciones', () => {
    const matrix = togglePermission(toPermissionMatrix(permissions, []), 3);

    expect(fromPermissionMatrix(matrix)).toEqual([3]);
    expect(fromPermissionMatrix(togglePermission(matrix, 3))).toEqual([]);
  });

  it('«Seleccionar todo» marca todos los permisos; con todos marcados, los quita', () => {
    const all = toggleAll(toPermissionMatrix(permissions, [4]));
    expect(fromPermissionMatrix(all).sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6]);

    expect(fromPermissionMatrix(toggleAll(all))).toEqual([]);
  });

  it('un módulo sin permisos elegidos queda con la fila vacía', () => {
    const matrix = toPermissionMatrix(permissions, [1]);
    const appointments = matrix.rows.find((r) => r.subject === 'APPOINTMENTS')!;

    expect(rowState(appointments)).toEqual({ all: false, some: false });
    expect(rowState(matrix.rows.find((r) => r.subject === 'PATIENTS')!)).toEqual({ all: false, some: true });
    expect(appointments.cells.MANAGE).toBeNull();
  });

  it('las filas empiezan por «Todos» y las acciones por «Gestionar»', () => {
    const matrix = toPermissionMatrix(permissions, []);

    expect(matrix.rows.map((r) => r.subject)).toEqual(['ALL', 'APPOINTMENTS', 'PATIENTS']);
    expect(matrix.actions[0]).toBe('MANAGE');
  });
});
