/**
 * Fuente declarativa única de la matriz RBAC (SDD-012).
 *
 * Antes de este módulo, `seed.ts` y `seed-rbac.ts` mantenían cada uno su
 * propia matriz de subjects/actions/roles→permisos, y podían divergir sin que
 * nada lo detectara (F-11: el paciente tenía `UPDATE:APPOINTMENTS` en uno y
 * no en el otro, pese a que el controlador exige ese permiso para que un
 * paciente pueda cancelar su propia cita).
 *
 * Este archivo es ahora la única fuente de verdad. `seed.ts` la invoca para
 * poblar `Permissions`/`Roles`/`RolePermissions`, y el test
 * `rbac-policy.spec.ts` verifica su forma (unicidad, cobertura de subjects,
 * frontera de permisos no declarados) sin tocar la base de datos.
 *
 * `PermissionSubject` y `SystemRole` (shared/domain/enums/permission.enum.ts)
 * son el vocabulario canónico: cualquier subject usado aquí debe existir ahí,
 * y viceversa (lo comprueba el test).
 */
import {
  PermissionAction,
  PermissionSubject,
  SystemRole,
} from '../src/shared/domain/enums/permission.enum.js';

export interface RbacPermissionDef {
  action: PermissionAction;
  subject: PermissionSubject;
  description: string;
}

/** Subjects reales del sistema, excluyendo el wildcard ALL (se maneja aparte). */
export const RBAC_SUBJECTS: readonly PermissionSubject[] = Object.values(
  PermissionSubject,
).filter((s) => s !== PermissionSubject.ALL);

/** Acciones concretas (sin el wildcard MANAGE, que se genera por separado). */
export const RBAC_ACTIONS: readonly PermissionAction[] = Object.values(
  PermissionAction,
).filter((a) => a !== PermissionAction.MANAGE);

/**
 * Construye el catálogo completo de permisos: CRUD por cada subject, más
 * MANAGE:{subject} (wildcard de acción por subject) y MANAGE:ALL (super-admin).
 */
export function buildPermissionCatalog(): RbacPermissionDef[] {
  const permissions: RbacPermissionDef[] = [];

  permissions.push({
    action: PermissionAction.MANAGE,
    subject: PermissionSubject.ALL,
    description: 'Acceso total a todos los recursos del sistema',
  });

  for (const subject of RBAC_SUBJECTS) {
    for (const action of RBAC_ACTIONS) {
      permissions.push({
        action,
        subject,
        description: `${action} ${subject}`,
      });
    }
    permissions.push({
      action: PermissionAction.MANAGE,
      subject,
      description: `MANAGE ${subject} (todas las acciones sobre el recurso)`,
    });
  }

  return permissions;
}

/** Clave canónica `ACTION:SUBJECT` usada para mapear rol → permiso. */
export function permissionKey(
  action: PermissionAction,
  subject: PermissionSubject,
): string {
  return `${action}:${subject}`;
}

/**
 * Matriz declarativa rol → permisos concedidos.
 *
 * SUPER_ADMIN y ADMIN comparten el wildcard MANAGE:ALL; la distinción entre
 * "super-admin global" y "admin de sede" vive en `clinicId` (null vs asignado),
 * no en el conjunto de permisos — así lo trata `TenantGuard` y
 * `AppointmentAccessPolicy` ya en producción.
 *
 * PATIENT incluye UPDATE:APPOINTMENTS porque el controlador exige ese permiso
 * para que un paciente cancele o reagende su propia cita
 * (`PATCH /appointments/:id/cancel`, `PATCH /appointments/:id/reschedule`);
 * el ownership real lo sigue validando `AppointmentAccessPolicy`, el permiso
 * solo abre la puerta del guard.
 */
export const ROLE_PERMISSIONS: Readonly<Record<SystemRole, readonly string[]>> =
  {
    [SystemRole.SUPER_ADMIN]: [
      permissionKey(PermissionAction.MANAGE, PermissionSubject.ALL),
    ],

    [SystemRole.ADMIN]: [
      permissionKey(PermissionAction.MANAGE, PermissionSubject.ALL),
    ],

    [SystemRole.DOCTOR]: [
      permissionKey(PermissionAction.READ, PermissionSubject.APPOINTMENTS),
      permissionKey(PermissionAction.CREATE, PermissionSubject.APPOINTMENTS),
      permissionKey(PermissionAction.UPDATE, PermissionSubject.APPOINTMENTS),
      permissionKey(PermissionAction.READ, PermissionSubject.PATIENTS),
      permissionKey(PermissionAction.CREATE, PermissionSubject.CLINICAL_NOTES),
      permissionKey(PermissionAction.READ, PermissionSubject.CLINICAL_NOTES),
      permissionKey(PermissionAction.CREATE, PermissionSubject.PRESCRIPTIONS),
      permissionKey(PermissionAction.READ, PermissionSubject.PRESCRIPTIONS),
      permissionKey(PermissionAction.CREATE, PermissionSubject.MEDICAL_HISTORY),
      permissionKey(PermissionAction.READ, PermissionSubject.MEDICAL_HISTORY),
      permissionKey(PermissionAction.UPDATE, PermissionSubject.MEDICAL_HISTORY),
      permissionKey(PermissionAction.READ, PermissionSubject.SCHEDULES),
      permissionKey(PermissionAction.READ, PermissionSubject.AVAILABILITY),
      permissionKey(PermissionAction.READ, PermissionSubject.SCHEDULE_BLOCKS),
      permissionKey(PermissionAction.READ, PermissionSubject.NOTIFICATIONS),
      permissionKey(PermissionAction.UPDATE, PermissionSubject.NOTIFICATIONS),
      permissionKey(PermissionAction.READ, PermissionSubject.PAYMENTS),
      permissionKey(PermissionAction.READ, PermissionSubject.REVIEWS),
    ],

    [SystemRole.RECEPTIONIST]: [
      permissionKey(PermissionAction.CREATE, PermissionSubject.PATIENTS),
      permissionKey(PermissionAction.READ, PermissionSubject.PATIENTS),
      permissionKey(PermissionAction.UPDATE, PermissionSubject.PATIENTS),
      permissionKey(PermissionAction.CREATE, PermissionSubject.APPOINTMENTS),
      permissionKey(PermissionAction.READ, PermissionSubject.APPOINTMENTS),
      permissionKey(PermissionAction.UPDATE, PermissionSubject.APPOINTMENTS),
      permissionKey(PermissionAction.READ, PermissionSubject.DOCTORS),
      permissionKey(PermissionAction.MANAGE, PermissionSubject.SCHEDULES),
      permissionKey(PermissionAction.MANAGE, PermissionSubject.AVAILABILITY),
      permissionKey(PermissionAction.READ, PermissionSubject.SPECIALTIES),
      permissionKey(PermissionAction.READ, PermissionSubject.CATEGORIES),
      permissionKey(PermissionAction.MANAGE, PermissionSubject.SCHEDULE_BLOCKS),
      permissionKey(PermissionAction.READ, PermissionSubject.HOLIDAYS),
      permissionKey(PermissionAction.CREATE, PermissionSubject.HOLIDAYS),
      permissionKey(PermissionAction.UPDATE, PermissionSubject.HOLIDAYS),
      permissionKey(PermissionAction.DELETE, PermissionSubject.HOLIDAYS),
      permissionKey(PermissionAction.READ, PermissionSubject.NOTIFICATIONS),
      permissionKey(PermissionAction.CREATE, PermissionSubject.NOTIFICATIONS),
      permissionKey(PermissionAction.UPDATE, PermissionSubject.NOTIFICATIONS),
      permissionKey(PermissionAction.READ, PermissionSubject.REPORTS),
    ],

    [SystemRole.PATIENT]: [
      permissionKey(PermissionAction.READ, PermissionSubject.APPOINTMENTS),
      permissionKey(PermissionAction.CREATE, PermissionSubject.APPOINTMENTS),
      // Requerido por el controlador para cancelar/reagendar la propia cita;
      // AppointmentAccessPolicy sigue exigiendo ownership (F-11).
      permissionKey(PermissionAction.UPDATE, PermissionSubject.APPOINTMENTS),
      permissionKey(PermissionAction.READ, PermissionSubject.CLINICS),
      permissionKey(PermissionAction.READ, PermissionSubject.CATEGORIES),
      permissionKey(PermissionAction.READ, PermissionSubject.SPECIALTIES),
      permissionKey(PermissionAction.READ, PermissionSubject.DOCTORS),
      permissionKey(PermissionAction.READ, PermissionSubject.SCHEDULES),
      permissionKey(PermissionAction.READ, PermissionSubject.PATIENTS),
      permissionKey(PermissionAction.READ, PermissionSubject.CLINICAL_NOTES),
      permissionKey(PermissionAction.READ, PermissionSubject.PRESCRIPTIONS),
      permissionKey(PermissionAction.READ, PermissionSubject.MEDICAL_HISTORY),
      permissionKey(PermissionAction.READ, PermissionSubject.NOTIFICATIONS),
      permissionKey(PermissionAction.UPDATE, PermissionSubject.NOTIFICATIONS),
      permissionKey(PermissionAction.READ, PermissionSubject.PAYMENTS),
      permissionKey(PermissionAction.CREATE, PermissionSubject.REVIEWS),
      permissionKey(PermissionAction.READ, PermissionSubject.REVIEWS),
    ],
  };

/** Roles de sistema, en el orden en que deben crearse (estable para seeds). */
export const SYSTEM_ROLE_ORDER: readonly SystemRole[] = [
  SystemRole.SUPER_ADMIN,
  SystemRole.ADMIN,
  SystemRole.DOCTOR,
  SystemRole.RECEPTIONIST,
  SystemRole.PATIENT,
];

export const SYSTEM_ROLE_DESCRIPTIONS: Readonly<Record<SystemRole, string>> = {
  [SystemRole.SUPER_ADMIN]: 'Super administrador con acceso total al sistema',
  [SystemRole.ADMIN]: 'Administrador del sistema o de una clínica',
  [SystemRole.DOCTOR]: 'Médico con acceso a sus citas y pacientes',
  [SystemRole.RECEPTIONIST]:
    'Recepcionista con acceso a la gestión de citas y pacientes',
  [SystemRole.PATIENT]: 'Paciente con acceso a sus propias citas y perfil',
};
