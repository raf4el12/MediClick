import type { ActorProfile } from '../session';

export const admin: ActorProfile = {
  user: {
    id: 400,
    name: 'Alba Administración',
    email: 'alba.admin@test.local',
    role: 'ADMIN',
    permissions: ['MANAGE:ALL'],
    clinicName: 'Sede Central',
    clinicTimezone: 'America/Lima',
  },
  clinicId: 1,
  routes: {
    'GET /notifications/unread-count': { count: 0 },
  },
};
