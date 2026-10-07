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
    'GET /appointments/my': { totalRows: 0, totalPages: 0, currentPage: 1, rows: [] },
  },
};
