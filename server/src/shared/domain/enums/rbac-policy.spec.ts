import {
  PermissionAction,
  PermissionSubject,
  SystemRole,
} from './permission.enum.js';
import {
  RBAC_ACTIONS,
  RBAC_SUBJECTS,
  ROLE_PERMISSIONS,
  SYSTEM_ROLE_ORDER,
  buildPermissionCatalog,
  permissionKey,
} from '../../../../prisma/rbac-policy.js';

/**
 * SDD-012: la matriz RBAC vive en un único lugar (`rbac-policy.ts`).
 * `seed.ts` y `seed-rbac.ts` la consumen; este test verifica la forma de esa
 * política y su compatibilidad con el algoritmo real de `PermissionsGuard`
 * (wildcards MANAGE/ALL), sin tocar base de datos ni HTTP — el seam es el
 * módulo declarativo en sí.
 */

/** Replica exacta del algoritmo de matching de PermissionsGuard#matchPermission. */
function hasPermission(
  granted: { action: string; subject: string }[],
  required: { action: string; subject: string },
): boolean {
  return granted.some((p) => {
    const actionMatch = p.action === required.action || p.action === 'MANAGE';
    const subjectMatch = p.subject === required.subject || p.subject === 'ALL';
    return actionMatch && subjectMatch;
  });
}

function grantedPermissionsFor(role: SystemRole) {
  return ROLE_PERMISSIONS[role].map((key) => {
    const [action, subject] = key.split(':');
    return { action, subject };
  });
}

describe('rbac-policy (fuente única declarativa)', () => {
  describe('vocabulario canónico', () => {
    it('todo subject usado en ROLE_PERMISSIONS existe en PermissionSubject', () => {
      const knownSubjects = new Set(Object.values(PermissionSubject));
      for (const [role, keys] of Object.entries(ROLE_PERMISSIONS)) {
        for (const key of keys) {
          const [, subject] = key.split(':');
          expect(knownSubjects.has(subject as PermissionSubject)).toBe(true);
        }
        void role;
      }
    });

    it('todo action usado en ROLE_PERMISSIONS existe en PermissionAction', () => {
      const knownActions = new Set(Object.values(PermissionAction));
      for (const keys of Object.values(ROLE_PERMISSIONS)) {
        for (const key of keys) {
          const [action] = key.split(':');
          expect(knownActions.has(action as PermissionAction)).toBe(true);
        }
      }
    });

    it('ROLE_PERMISSIONS declara exactamente los 5 SystemRole, sin extras ni faltantes', () => {
      const declaredRoles = Object.keys(ROLE_PERMISSIONS).sort();
      const canonicalRoles = Object.values(SystemRole).sort();
      expect(declaredRoles).toEqual(canonicalRoles);
      expect(SYSTEM_ROLE_ORDER.slice().sort()).toEqual(canonicalRoles);
    });
  });

  describe('catálogo de permisos', () => {
    it('genera CRUD completo por subject más MANAGE:subject y MANAGE:ALL, sin duplicados', () => {
      const catalog = buildPermissionCatalog();
      const keys = catalog.map((p) => permissionKey(p.action, p.subject));

      expect(new Set(keys).size).toBe(keys.length); // sin duplicados

      const expectedSize = RBAC_SUBJECTS.length * (RBAC_ACTIONS.length + 1) + 1;
      expect(catalog.length).toBe(expectedSize);

      expect(keys).toContain(
        permissionKey(PermissionAction.MANAGE, PermissionSubject.ALL),
      );
      expect(keys).toContain(
        permissionKey(PermissionAction.READ, PermissionSubject.APPOINTMENTS),
      );
      expect(keys).toContain(
        permissionKey(PermissionAction.MANAGE, PermissionSubject.PAYMENTS),
      );
    });

    it('cada permiso declarado en ROLE_PERMISSIONS existe en el catálogo generado', () => {
      const catalog = new Set(
        buildPermissionCatalog().map((p) => permissionKey(p.action, p.subject)),
      );
      for (const keys of Object.values(ROLE_PERMISSIONS)) {
        for (const key of keys) {
          expect(catalog.has(key)).toBe(true);
        }
      }
    });
  });

  describe('caso permitido: PATIENT puede actualizar su propia cita (F-11)', () => {
    it('PATIENT tiene UPDATE:APPOINTMENTS — requerido por PATCH /appointments/:id/cancel', () => {
      const granted = grantedPermissionsFor(SystemRole.PATIENT);
      const allowed = hasPermission(granted, {
        action: PermissionAction.UPDATE,
        subject: PermissionSubject.APPOINTMENTS,
      });
      expect(allowed).toBe(true);
    });

    it('DOCTOR con READ:APPOINTMENTS puede leer citas (match exacto)', () => {
      const granted = grantedPermissionsFor(SystemRole.DOCTOR);
      expect(
        hasPermission(granted, {
          action: PermissionAction.READ,
          subject: PermissionSubject.APPOINTMENTS,
        }),
      ).toBe(true);
    });

    it('SUPER_ADMIN con MANAGE:ALL puede operar cualquier acción sobre cualquier subject', () => {
      const granted = grantedPermissionsFor(SystemRole.SUPER_ADMIN);
      expect(
        hasPermission(granted, {
          action: PermissionAction.DELETE,
          subject: PermissionSubject.CLINICS,
        }),
      ).toBe(true);
    });
  });

  describe('frontera rechazada: permisos no declarados', () => {
    it('PATIENT no puede eliminar citas (DELETE no declarado para PATIENT)', () => {
      const granted = grantedPermissionsFor(SystemRole.PATIENT);
      expect(
        hasPermission(granted, {
          action: PermissionAction.DELETE,
          subject: PermissionSubject.APPOINTMENTS,
        }),
      ).toBe(false);
    });

    it('PATIENT no tiene ningún permiso sobre ROLES', () => {
      const granted = grantedPermissionsFor(SystemRole.PATIENT);
      expect(
        hasPermission(granted, {
          action: PermissionAction.READ,
          subject: PermissionSubject.ROLES,
        }),
      ).toBe(false);
    });

    it('RECEPTIONIST no puede gestionar CLINICAL_NOTES (fuera de su matriz)', () => {
      const granted = grantedPermissionsFor(SystemRole.RECEPTIONIST);
      expect(
        hasPermission(granted, {
          action: PermissionAction.CREATE,
          subject: PermissionSubject.CLINICAL_NOTES,
        }),
      ).toBe(false);
    });

    it('DOCTOR no puede eliminar MEDICAL_HISTORY (solo CREATE/READ/UPDATE declarados)', () => {
      const granted = grantedPermissionsFor(SystemRole.DOCTOR);
      expect(
        hasPermission(granted, {
          action: PermissionAction.DELETE,
          subject: PermissionSubject.MEDICAL_HISTORY,
        }),
      ).toBe(false);
    });

    it('un READ:ALL wildcard de acción no cruza a otra acción (DELETE) aunque exista MANAGE:subject', () => {
      // RECEPTIONIST tiene MANAGE:SCHEDULES; verifica que MANAGE sí wildcardea acción
      // pero un subject sin MANAGE ni la acción exacta declarada queda fuera.
      const granted = grantedPermissionsFor(SystemRole.RECEPTIONIST);
      expect(
        hasPermission(granted, {
          action: PermissionAction.DELETE,
          subject: PermissionSubject.SCHEDULES,
        }),
      ).toBe(true); // MANAGE:SCHEDULES sí cubre DELETE
      expect(
        hasPermission(granted, {
          action: PermissionAction.DELETE,
          subject: PermissionSubject.PATIENTS,
        }),
      ).toBe(false); // PATIENTS solo tiene CREATE/READ/UPDATE, no MANAGE
    });
  });
});
