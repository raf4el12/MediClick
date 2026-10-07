import rolePermissions from '../../fixtures/role-permissions.json';
import type { ActorProfile } from '../session';

export const receptionist: ActorProfile = {
  user: {
    id: 300,
    name: 'Rita Recepción',
    email: 'rita.recepcion@test.local',
    role: 'RECEPTIONIST',
    permissions: rolePermissions.RECEPTIONIST,
    clinicName: 'Sede Central',
    clinicTimezone: 'America/Lima',
  },
  clinicId: 1,
  routes: {
    'GET /notifications/unread-count': { count: 0 },
  },
};
