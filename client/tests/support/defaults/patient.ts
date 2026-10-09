import rolePermissions from '../../fixtures/role-permissions.json';
import type { ActorProfile } from '../session';

export const patient: ActorProfile = {
  user: {
    id: 100,
    name: 'Ana Paciente',
    email: 'ana.paciente@test.local',
    role: 'PATIENT',
    permissions: rolePermissions.PATIENT,
  },
  clinicId: null,
  routes: {
    'GET /notifications/unread-count': { count: 0 },
    'GET /notifications': { data: [], total: 0, page: 1, limit: 10, totalPages: 0 },
    'GET /appointments/my': { totalRows: 0, totalPages: 0, currentPage: 1, rows: [] },
    // Inicio del paciente (UI-11).
    'GET /appointments/my/summary': {
      nextAppointment: null,
      upcomingCount: 0,
      awaitingPaymentCount: 0,
      earliestPaymentDeadline: null,
      completedCount: 0,
      pendingReviewCount: 0,
    },
    'GET /waitlist/my/offers': [],
    'GET /reviews/my': [],
  },
};
