import rolePermissions from '../../fixtures/role-permissions.json';
import type { ActorProfile } from '../session';

const emptyAgenda = {
  timezone: 'America/Lima',
  range: { from: '2026-10-10', to: '2026-10-10' },
  doctors: [],
  cupos: [],
  appointments: [],
  blocks: [],
  holidays: [],
  indicators: {
    totalCupos: 0,
    bookedCupos: 0,
    occupancyRate: 0,
    byStatus: { PENDING: 0, CONFIRMED: 0, IN_PROGRESS: 0, COMPLETED: 0, CANCELLED: 0, NO_SHOW: 0 },
    atRisk: 0,
    pendingPayment: 0,
  },
};

export const doctor: ActorProfile = {
  user: {
    id: 200,
    name: 'Gregorio Médico',
    email: 'gregorio.medico@test.local',
    role: 'DOCTOR',
    permissions: rolePermissions.DOCTOR,
    clinicName: 'Sede Central',
    clinicTimezone: 'America/Lima',
  },
  clinicId: 1,
  routes: {
    'GET /notifications/unread-count': { count: 0 },
    'GET /notifications': { data: [], total: 0, page: 1, limit: 10, totalPages: 0 },
    'GET /agenda': emptyAgenda,
    'GET /appointments/doctor/today': [],
  },
};
