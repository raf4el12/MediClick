/**
 * Acciones posibles sobre recursos del sistema.
 */
export enum PermissionAction {
  CREATE = 'CREATE',
  READ = 'READ',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  MANAGE = 'MANAGE', // Wildcard: equivale a todas las acciones
}

/**
 * Recursos (subjects) del sistema sobre los cuales se aplican permisos.
 */
export enum PermissionSubject {
  ALL = 'ALL', // Wildcard: equivale a todos los subjects
  USERS = 'USERS',
  DOCTORS = 'DOCTORS',
  PATIENTS = 'PATIENTS',
  APPOINTMENTS = 'APPOINTMENTS',
  SCHEDULES = 'SCHEDULES',
  AVAILABILITY = 'AVAILABILITY',
  SPECIALTIES = 'SPECIALTIES',
  CATEGORIES = 'CATEGORIES',
  CLINICS = 'CLINICS',
  CLINICAL_NOTES = 'CLINICAL_NOTES',
  PRESCRIPTIONS = 'PRESCRIPTIONS',
  MEDICAL_HISTORY = 'MEDICAL_HISTORY',
  NOTIFICATIONS = 'NOTIFICATIONS',
  REPORTS = 'REPORTS',
  HOLIDAYS = 'HOLIDAYS',
  SCHEDULE_BLOCKS = 'SCHEDULE_BLOCKS',
  ROLES = 'ROLES',
}

/**
 * Nombre de los roles de sistema (isSystem = true).
 * Los custom roles creados por admins de clínica no están aquí.
 */
export enum SystemRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  DOCTOR = 'DOCTOR',
  RECEPTIONIST = 'RECEPTIONIST',
  PATIENT = 'PATIENT',
}
