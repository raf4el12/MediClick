'use client';

import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import type { RoleDto } from '../types';

const SUBJECT_LABELS: Record<string, string> = {
  ALL: 'Todos',
  APPOINTMENTS: 'Citas',
  AVAILABILITY: 'Disponibilidad',
  CATEGORIES: 'Categorías',
  CLINICS: 'Sedes',
  CLINICAL_NOTES: 'Notas Clínicas',
  DOCTORS: 'Doctores',
  HOLIDAYS: 'Feriados',
  MEDICAL_HISTORY: 'Historial Médico',
  NOTIFICATIONS: 'Notificaciones',
  PATIENTS: 'Pacientes',
  PRESCRIPTIONS: 'Recetas',
  REPORTS: 'Reportes',
  ROLES: 'Roles',
  SCHEDULES: 'Horarios',
  SCHEDULE_BLOCKS: 'Bloqueos',
  SPECIALTIES: 'Especialidades',
  USERS: 'Usuarios',
};

const ACTION_LABELS: Record<string, string> = {
  CREATE: 'Crear',
  READ: 'Leer',
  UPDATE: 'Editar',
  DELETE: 'Eliminar',
  MANAGE: 'Gestionar',
};

const ACTION_COLORS: Record<string, 'success' | 'info' | 'warning' | 'error' | 'primary'> = {
  CREATE: 'success',
  READ: 'info',
  UPDATE: 'warning',
  DELETE: 'error',
  MANAGE: 'primary',
};

interface PermissionsDialogProps {
  role: RoleDto | null;
  onClose: () => void;
}

export function PermissionsDialog({ role, onClose }: PermissionsDialogProps) {
  if (!role) return null;

  // Agrupar permisos por subject
  const grouped = new Map<string, typeof role.permissions>();
  for (const p of role.permissions) {
    const list = grouped.get(p.subject) ?? [];
    list.push(p);
    grouped.set(p.subject, list);
  }

  const subjects = Array.from(grouped.entries()).sort(([a], [b]) => {
    if (a === 'ALL') return -1;
    if (b === 'ALL') return 1;
    return a.localeCompare(b);
  });

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="h6" component="span" fontWeight={600}>
            Permisos de {role.name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {role.permissions.length} permiso{role.permissions.length !== 1 ? 's' : ''} asignado{role.permissions.length !== 1 ? 's' : ''}
          </Typography>
        </Box>
        <IconButton onClick={onClose} aria-label="Cerrar">
          <i className="ri-close-line" style={{ fontSize: 20 }} />
        </IconButton>
      </DialogTitle>
      <Divider />
      <DialogContent sx={{ pt: 2 }}>
        {subjects.map(([subject, perms], idx) => (
          <Box key={subject} sx={{ mb: idx < subjects.length - 1 ? 2 : 0 }}>
            <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
              {SUBJECT_LABELS[subject] ?? subject}
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, pl: 1 }}>
              {perms.map((p) => (
                <Chip
                  key={p.id}
                  label={ACTION_LABELS[p.action] ?? p.action}
                  size="small"
                  color={ACTION_COLORS[p.action] ?? 'default'}
                  sx={{ fontSize: '0.75rem' }}
                />
              ))}
            </Box>
          </Box>
        ))}
      </DialogContent>
    </Dialog>
  );
}
