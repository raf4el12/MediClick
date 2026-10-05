import type { ActorProfile } from '../session';

export const patient: ActorProfile = {
  user: {
    id: 100,
    name: 'Ana Paciente',
    email: 'ana.paciente@test.local',
    role: 'PATIENT',
    permissions: [
      'READ:APPOINTMENTS',
      'CREATE:APPOINTMENTS',
      'UPDATE:APPOINTMENTS',
      'READ:CLINICS',
      'READ:CATEGORIES',
      'READ:SPECIALTIES',
      'READ:DOCTORS',
      'READ:SCHEDULES',
      'READ:PATIENTS',
      'READ:CLINICAL_NOTES',
      'READ:PRESCRIPTIONS',
      'READ:MEDICAL_HISTORY',
      'READ:NOTIFICATIONS',
      'UPDATE:NOTIFICATIONS',
      'CREATE:REVIEWS',
      'READ:REVIEWS',
    ],
  },
  clinicId: null,
  routes: {
    'GET /notifications/unread-count': { count: 0 },
    'GET /appointments/my': { totalRows: 0, totalPages: 0, currentPage: 1, rows: [] },
  },
};
