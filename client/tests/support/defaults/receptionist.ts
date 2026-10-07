import type { ActorProfile } from '../session';

export const receptionist: ActorProfile = {
  user: {
    id: 300,
    name: 'Rita Recepción',
    email: 'rita.recepcion@test.local',
    role: 'RECEPTIONIST',
    permissions: [
      'CREATE:PATIENTS',
      'READ:PATIENTS',
      'UPDATE:PATIENTS',
      'CREATE:APPOINTMENTS',
      'READ:APPOINTMENTS',
      'UPDATE:APPOINTMENTS',
      'READ:DOCTORS',
      'MANAGE:SCHEDULES',
      'MANAGE:AVAILABILITY',
      'READ:SPECIALTIES',
      'READ:CATEGORIES',
      'MANAGE:SCHEDULE_BLOCKS',
      'READ:HOLIDAYS',
      'CREATE:HOLIDAYS',
      'UPDATE:HOLIDAYS',
      'DELETE:HOLIDAYS',
      'READ:NOTIFICATIONS',
      'CREATE:NOTIFICATIONS',
      'UPDATE:NOTIFICATIONS',
      'READ:REPORTS',
    ],
    clinicName: 'Sede Central',
    clinicTimezone: 'America/Lima',
  },
  clinicId: 1,
  routes: {
    'GET /notifications/unread-count': { count: 0 },
  },
};
