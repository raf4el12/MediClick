export enum UserRole {
  ADMIN = 'ADMIN',
  DOCTOR = 'DOCTOR',
  RECEPTIONIST = 'RECEPTIONIST',
  PATIENT = 'PATIENT',
}

export function toUserRole(value: string): UserRole {
  if (Object.values(UserRole).includes(value as UserRole)) {
    return value as UserRole;
  }
  throw new Error(`Invalid UserRole: ${value}`);
}
