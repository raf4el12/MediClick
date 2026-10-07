import type { ActorProfile } from '../session';

export const doctor: ActorProfile = {
  user: {
    id: 200,
    name: 'Gregorio Médico',
    email: 'gregorio.medico@test.local',
    role: 'DOCTOR',
    permissions: [
      'READ:APPOINTMENTS',
      'CREATE:APPOINTMENTS',
      'UPDATE:APPOINTMENTS',
      'READ:PATIENTS',
      'CREATE:CLINICAL_NOTES',
      'READ:CLINICAL_NOTES',
      'CREATE:PRESCRIPTIONS',
      'READ:PRESCRIPTIONS',
      'CREATE:MEDICAL_HISTORY',
      'READ:MEDICAL_HISTORY',
      'UPDATE:MEDICAL_HISTORY',
      'READ:SCHEDULES',
      'READ:AVAILABILITY',
      'READ:SCHEDULE_BLOCKS',
      'READ:NOTIFICATIONS',
      'UPDATE:NOTIFICATIONS',
      'READ:PAYMENTS',
      'READ:REVIEWS',
    ],
    clinicName: 'Sede Central',
    clinicTimezone: 'America/Lima',
  },
  clinicId: 1,
  routes: {
    'GET /notifications/unread-count': { count: 0 },
  },
};
