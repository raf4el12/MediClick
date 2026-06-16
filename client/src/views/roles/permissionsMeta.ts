import type { PermissionDto, RoleDto } from './types';

type MuiColor = 'success' | 'info' | 'warning' | 'error' | 'primary' | 'secondary';

/** Etiqueta legible por dominio (subject) */
export const SUBJECT_LABELS: Record<string, string> = {
  ALL: 'Todos',
  APPOINTMENTS: 'Citas',
  AVAILABILITY: 'Disponibilidad',
  CATEGORIES: 'Categorías',
  CLINICS: 'Sedes',
  CLINICAL_NOTES: 'Notas Clínicas',
  DOCTORS: 'Doctores',
  HOLIDAYS: 'Feriados',
  MEDICAL_HISTORY: 'Historial Médico',
  NOTIFICATIONS: 'Notificaciones',
  PATIENTS: 'Pacientes',
  PAYMENTS: 'Pagos',
  PRESCRIPTIONS: 'Recetas',
  REPORTS: 'Reportes',
  REVIEWS: 'Reseñas',
  ROLES: 'Roles',
  SCHEDULES: 'Horarios',
  SCHEDULE_BLOCKS: 'Bloqueos',
  SPECIALTIES: 'Especialidades',
  USERS: 'Usuarios',
};

/** Ícono Remix por dominio */
export const SUBJECT_ICONS: Record<string, string> = {
  ALL: 'ri-shield-star-line',
  APPOINTMENTS: 'ri-calendar-check-line',
  AVAILABILITY: 'ri-time-line',
  CATEGORIES: 'ri-price-tag-3-line',
  CLINICS: 'ri-hospital-line',
  CLINICAL_NOTES: 'ri-sticky-note-line',
  DOCTORS: 'ri-stethoscope-line',
  HOLIDAYS: 'ri-flag-line',
  MEDICAL_HISTORY: 'ri-file-list-3-line',
  NOTIFICATIONS: 'ri-notification-3-line',
  PATIENTS: 'ri-user-heart-line',
  PAYMENTS: 'ri-bank-card-line',
  PRESCRIPTIONS: 'ri-capsule-line',
  REPORTS: 'ri-bar-chart-box-line',
  REVIEWS: 'ri-star-line',
  ROLES: 'ri-shield-keyhole-line',
  SCHEDULES: 'ri-calendar-2-line',
  SCHEDULE_BLOCKS: 'ri-calendar-close-line',
  SPECIALTIES: 'ri-medicine-bottle-line',
  USERS: 'ri-group-line',
};

export const ACTION_LABELS: Record<string, string> = {
  CREATE: 'Crear',
  READ: 'Leer',
  UPDATE: 'Editar',
  DELETE: 'Eliminar',
  MANAGE: 'Gestionar',
};

export const ACTION_COLORS: Record<string, MuiColor> = {
  CREATE: 'success',
  READ: 'info',
  UPDATE: 'warning',
  DELETE: 'error',
  MANAGE: 'primary',
};

/** Orden de relevancia: Gestionar engloba al resto, luego el CRUD natural */
const ACTION_ORDER: Record<string, number> = {
  MANAGE: 0,
  CREATE: 1,
  READ: 2,
  UPDATE: 3,
  DELETE: 4,
};

export const subjectLabel = (subject: string): string =>
  SUBJECT_LABELS[subject] ?? subject;

export const subjectIcon = (subject: string): string =>
  SUBJECT_ICONS[subject] ?? 'ri-folder-2-line';

export const actionLabel = (action: string): string =>
  ACTION_LABELS[action] ?? action;

export const actionColor = (action: string): MuiColor =>
  ACTION_COLORS[action] ?? 'secondary';

/** Un rol con MANAGE sobre ALL tiene acceso total al sistema */
export const isFullAccess = (permissions: PermissionDto[]): boolean =>
  permissions.some((p) => p.action === 'MANAGE' && p.subject === 'ALL');

/** Dominios funcionales para agrupar los subjects en bloques escaneables */
export interface PermissionDomain {
  key: string;
  label: string;
  icon: string;
  subjects: string[];
}

export const PERMISSION_DOMAINS: PermissionDomain[] = [
  {
    key: 'agenda',
    label: 'Agenda y atención',
    icon: 'ri-calendar-2-line',
    subjects: [
      'APPOINTMENTS',
      'AVAILABILITY',
      'SCHEDULES',
      'SCHEDULE_BLOCKS',
      'HOLIDAYS',
    ],
  },
  {
    key: 'clinical',
    label: 'Pacientes y clínica',
    icon: 'ri-heart-pulse-line',
    subjects: [
      'PATIENTS',
      'MEDICAL_HISTORY',
      'CLINICAL_NOTES',
      'PRESCRIPTIONS',
      'DOCTORS',
      'SPECIALTIES',
    ],
  },
  {
    key: 'ops',
    label: 'Operación',
    icon: 'ri-building-line',
    subjects: ['CLINICS', 'CATEGORIES', 'PAYMENTS', 'REPORTS', 'NOTIFICATIONS', 'REVIEWS'],
  },
  {
    key: 'admin',
    label: 'Administración',
    icon: 'ri-admin-line',
    subjects: ['ALL', 'USERS', 'ROLES'],
  },
];

const SUBJECT_TO_DOMAIN = new Map<string, string>();
PERMISSION_DOMAINS.forEach((d) =>
  d.subjects.forEach((s) => SUBJECT_TO_DOMAIN.set(s, d.key)),
);

const OTHER_DOMAIN: PermissionDomain = {
  key: 'other',
  label: 'Otros',
  icon: 'ri-more-2-line',
  subjects: [],
};

export interface SubjectGroup {
  subject: string;
  permissions: PermissionDto[];
}

export interface DomainGroup {
  domain: PermissionDomain;
  subjects: SubjectGroup[];
}

/** Agrupa permisos por subject, con sus acciones ordenadas por relevancia */
export function groupBySubject(permissions: PermissionDto[]): SubjectGroup[] {
  const map = new Map<string, PermissionDto[]>();
  for (const p of permissions) {
    const list = map.get(p.subject) ?? [];
    list.push(p);
    map.set(p.subject, list);
  }
  return Array.from(map.entries()).map(([subject, perms]) => ({
    subject,
    permissions: perms.sort(
      (a, b) => (ACTION_ORDER[a.action] ?? 9) - (ACTION_ORDER[b.action] ?? 9),
    ),
  }));
}

/**
 * Agrupa permisos en dominios funcionales (agenda, clínica, operación, admin).
 * Solo retorna dominios que tengan al menos un subject presente.
 */
export function groupByDomain(permissions: PermissionDto[]): DomainGroup[] {
  const bySubject = new Map<string, SubjectGroup>();
  for (const sg of groupBySubject(permissions)) {
    bySubject.set(sg.subject, sg);
  }

  const result: DomainGroup[] = [];

  for (const domain of PERMISSION_DOMAINS) {
    const subjects = domain.subjects
      .map((s) => bySubject.get(s))
      .filter((sg): sg is SubjectGroup => Boolean(sg));
    if (subjects.length > 0) {
      result.push({ domain, subjects });
    }
  }

  // Subjects sin dominio conocido → bloque "Otros"
  const known = new Set(PERMISSION_DOMAINS.flatMap((d) => d.subjects));
  const orphans = Array.from(bySubject.values())
    .filter((sg) => !known.has(sg.subject))
    .sort((a, b) => subjectLabel(a.subject).localeCompare(subjectLabel(b.subject)));
  if (orphans.length > 0) {
    result.push({ domain: OTHER_DOMAIN, subjects: orphans });
  }

  return result;
}

/** Cantidad de subjects (módulos) distintos cubiertos por un set de permisos */
export const moduleCount = (permissions: PermissionDto[]): number =>
  new Set(permissions.map((p) => p.subject)).size;

/** Identidad visual (ícono + color) por rol, con fallback para roles personalizados */
export interface RoleVisual {
  icon: string;
  color: MuiColor;
}

const ROLE_VISUALS: Record<string, RoleVisual> = {
  SUPER_ADMIN: { icon: 'ri-vip-crown-2-line', color: 'warning' },
  ADMIN: { icon: 'ri-shield-star-line', color: 'primary' },
  CLINIC_ADMIN: { icon: 'ri-building-4-line', color: 'primary' },
  DOCTOR: { icon: 'ri-stethoscope-line', color: 'info' },
  PATIENT: { icon: 'ri-user-heart-line', color: 'success' },
  RECEPTIONIST: { icon: 'ri-customer-service-2-line', color: 'secondary' },
};

export function roleVisual(role: Pick<RoleDto, 'name' | 'isSystem'>): RoleVisual {
  return (
    ROLE_VISUALS[role.name?.toUpperCase()] ?? {
      icon: role.isSystem ? 'ri-shield-keyhole-line' : 'ri-user-settings-line',
      color: 'secondary',
    }
  );
}
