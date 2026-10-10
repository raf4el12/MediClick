/**
 * Navegación de MediClick por actor: una sola fuente para el menú, la barra
 * inferior del paciente y el título de cada ruta. Pura y sin React, para
 * probarla contra la matriz de permisos (tests/fixtures/role-permissions.json).
 */

export type Actor = 'PATIENT' | 'DOCTOR' | 'STAFF';

export type Can = (action: string, subject: string) => boolean;

export interface NavLink {
  title: string;
  path: string;
  icon: string;
}

interface NavItem extends NavLink {
  /** Actores que ven el ítem; sin `actors`, cualquiera con el permiso. */
  actors?: Actor[];
  /** Basta uno de estos permisos. */
  permissions?: { action: string; subject: string }[];
}

export interface NavSection {
  title: string;
  items: NavLink[];
}

const STAFF_ACTORS: Actor[] = ['DOCTOR', 'STAFF'];

const sections: { title: string; items: NavItem[] }[] = [
  {
    title: 'Mi Portal',
    items: [
      { title: 'Inicio', path: '/patient', icon: 'ri-home-4-line', actors: ['PATIENT'] },
      { title: 'Mis Citas', path: '/patient/appointments', icon: 'ri-calendar-check-line', actors: ['PATIENT'] },
      { title: 'Reservar Cita', path: '/patient/book', icon: 'ri-add-circle-line', actors: ['PATIENT'] },
      { title: 'Lista de Espera', path: '/patient/waitlist', icon: 'ri-time-line', actors: ['PATIENT'] },
      { title: 'Mi Expediente', path: '/patient/expediente', icon: 'ri-file-chart-line', actors: ['PATIENT'] },
      { title: 'Mi Perfil', path: '/patient/profile', icon: 'ri-user-line', actors: ['PATIENT'] },
      {
        title: 'Notificaciones',
        path: '/notifications',
        icon: 'ri-notification-4-line',
        actors: ['PATIENT'],
        permissions: [{ action: 'READ', subject: 'NOTIFICATIONS' }],
      },
    ],
  },
  {
    title: 'General',
    items: [
      {
        title: 'Dashboard',
        path: '/dashboard',
        icon: 'ri-dashboard-line',
        actors: STAFF_ACTORS,
        permissions: [{ action: 'MANAGE', subject: 'CLINICS' }],
      },
      { title: 'Jornada', path: '/doctor', icon: 'ri-home-4-line', actors: ['DOCTOR'] },
      {
        title: 'Notificaciones',
        path: '/notifications',
        icon: 'ri-notification-4-line',
        actors: STAFF_ACTORS,
        permissions: [{ action: 'READ', subject: 'NOTIFICATIONS' }],
      },
    ],
  },
  {
    title: 'Gestión Médica',
    items: [
      { title: 'Agenda', path: '/doctor/agenda', icon: 'ri-calendar-todo-line', actors: ['DOCTOR'] },
      {
        title: 'Citas',
        path: '/appointments',
        icon: 'ri-calendar-check-line',
        actors: STAFF_ACTORS,
        permissions: [{ action: 'READ', subject: 'APPOINTMENTS' }],
      },
      {
        title: 'Lista de Espera',
        path: '/waitlist',
        icon: 'ri-time-line',
        actors: STAFF_ACTORS,
        permissions: [{ action: 'READ', subject: 'APPOINTMENTS' }],
      },
      {
        title: 'Pacientes',
        path: '/patients',
        icon: 'ri-user-heart-line',
        actors: STAFF_ACTORS,
        permissions: [{ action: 'READ', subject: 'PATIENTS' }],
      },
      {
        title: 'Doctores',
        path: '/doctors',
        icon: 'ri-stethoscope-line',
        actors: STAFF_ACTORS,
        permissions: [{ action: 'READ', subject: 'DOCTORS' }],
      },
      {
        title: 'Notas Clínicas',
        path: '/clinical-notes',
        icon: 'ri-file-text-line',
        actors: STAFF_ACTORS,
        permissions: [{ action: 'READ', subject: 'CLINICAL_NOTES' }],
      },
      {
        title: 'Recetas',
        path: '/prescriptions',
        icon: 'ri-medicine-bottle-line',
        actors: STAFF_ACTORS,
        permissions: [{ action: 'READ', subject: 'PRESCRIPTIONS' }],
      },
      {
        title: 'Historial Médico',
        path: '/medical-history',
        icon: 'ri-file-list-3-line',
        actors: STAFF_ACTORS,
        permissions: [{ action: 'READ', subject: 'MEDICAL_HISTORY' }],
      },
    ],
  },
  {
    title: 'Programación',
    items: [
      {
        title: 'Horarios',
        path: '/schedules',
        icon: 'ri-time-line',
        actors: STAFF_ACTORS,
        permissions: [{ action: 'READ', subject: 'SCHEDULES' }],
      },
      {
        title: 'Disponibilidad',
        path: '/availability',
        icon: 'ri-calendar-event-line',
        actors: STAFF_ACTORS,
        permissions: [{ action: 'READ', subject: 'AVAILABILITY' }],
      },
      {
        title: 'Bloqueos',
        path: '/schedule-blocks',
        icon: 'ri-calendar-close-line',
        actors: STAFF_ACTORS,
        permissions: [{ action: 'READ', subject: 'SCHEDULE_BLOCKS' }],
      },
      {
        title: 'Feriados',
        path: '/holidays',
        icon: 'ri-calendar-2-line',
        actors: STAFF_ACTORS,
        permissions: [{ action: 'READ', subject: 'HOLIDAYS' }],
      },
    ],
  },
  {
    title: 'Configuración',
    items: [
      { title: 'Sedes', path: '/clinics', icon: 'ri-building-line', permissions: [{ action: 'MANAGE', subject: 'CLINICS' }] },
      {
        title: 'Especialidades',
        path: '/specialties',
        icon: 'ri-heart-pulse-line',
        permissions: [{ action: 'MANAGE', subject: 'SPECIALTIES' }],
      },
      { title: 'Categorías', path: '/categories', icon: 'ri-folder-line', permissions: [{ action: 'MANAGE', subject: 'CATEGORIES' }] },
      { title: 'Usuarios', path: '/users', icon: 'ri-group-line', permissions: [{ action: 'READ', subject: 'USERS' }] },
      {
        title: 'Roles y Permisos',
        path: '/roles',
        icon: 'ri-shield-keyhole-line',
        permissions: [{ action: 'MANAGE', subject: 'ROLES' }],
      },
      {
        title: 'Pagos',
        path: '/payments',
        icon: 'ri-bank-card-line',
        actors: STAFF_ACTORS,
        permissions: [{ action: 'READ', subject: 'PAYMENTS' }],
      },
      { title: 'Reportes', path: '/reports', icon: 'ri-bar-chart-box-line', permissions: [{ action: 'READ', subject: 'REPORTS' }] },
    ],
  },
];

const BOTTOM_NAV_PATHS = ['/patient', '/patient/book', '/patient/appointments', '/patient/profile'];

// Rutas sin ítem de menú propio (o con un título distinto al del menú).
const EXTRA_TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/schedule-blocks': 'Bloqueos de Horario',
  '/profile': 'Mi Perfil',
  '/settings/account': 'Configuración',
};

export function actorFor(role: string | null | undefined): Actor {
  if (role === 'PATIENT') return 'PATIENT';
  if (role === 'DOCTOR') return 'DOCTOR';
  return 'STAFF';
}

/** `can` con el mismo criterio que PermissionsGuard: MANAGE y ALL son comodines. */
const HOME_BY_ACTOR: Record<Actor, string> = {
  PATIENT: '/patient',
  DOCTOR: '/doctor',
  STAFF: '/dashboard',
};

export function homePathFor(actor: Actor): string {
  return HOME_BY_ACTOR[actor];
}

/** Destino de "Mi perfil": el paciente tiene su propia página. */
export function profilePathFor(actor: Actor): string {
  return actor === 'PATIENT' ? '/patient/profile' : '/profile';
}

export function canFrom(permissions: string[]): Can {
  return (action, subject) =>
    permissions.some((p) => {
      const [a, s] = p.split(':');
      return (a === action || a === 'MANAGE') && (s === subject || s === 'ALL');
    });
}

export function navigationFor(
  actor: Actor,
  can: Can,
): { sections: NavSection[]; bottomNav?: NavLink[] } {
  const visible = (item: NavItem) =>
    (!item.actors || item.actors.includes(actor)) &&
    (!item.permissions || item.permissions.some((p) => can(p.action, p.subject)));

  const result = sections
    .map((section) => ({
      title: section.title,
      items: section.items.filter(visible).map(({ title, path, icon }) => ({ title, path, icon })),
    }))
    .filter((section) => section.items.length > 0);

  if (actor !== 'PATIENT') return { sections: result };

  const links = result.flatMap((section) => section.items);
  return {
    sections: result,
    bottomNav: BOTTOM_NAV_PATHS.flatMap((path) => links.filter((link) => link.path === path)),
  };
}

export function pageTitle(pathname: string): string {
  if (EXTRA_TITLES[pathname]) return EXTRA_TITLES[pathname];
  for (const section of sections) {
    const item = section.items.find((i) => i.path === pathname);
    if (item) return item.title;
  }
  return 'MediClick';
}
