/**
 * @deprecated Usar SystemRole de permission.enum.ts para nuevos guards/permisos.
 * Mantenido por retrocompatibilidad con lógica de negocio que verifica tipo de rol.
 */
export { SystemRole as UserRole } from './permission.enum.js';

export function toUserRole(value: string): string {
  return value;
}
