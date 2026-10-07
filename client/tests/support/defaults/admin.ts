import type { ActorProfile } from '../session';

const emptyPage = { totalRows: 0, totalPages: 0, currentPage: 1, rows: [] };

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
    // Dashboard de administración: conteos con listados vacíos y reportes en cero.
    'GET /appointments': emptyPage,
    'GET /patients': emptyPage,
    'GET /doctors': emptyPage,
    'GET /specialties': emptyPage,
    'GET /reports/appointments-summary': { total: 0, byStatus: {}, daily: [] },
    'GET /reports/schedule-occupancy': {
      totalSlots: 0,
      bookedSlots: 0,
      availableSlots: 0,
      occupancyRate: 0,
    },
  },
};
