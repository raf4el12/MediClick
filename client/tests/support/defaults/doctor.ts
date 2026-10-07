import rolePermissions from '../../fixtures/role-permissions.json';
import type { ActorProfile } from '../session';

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
  },
};
