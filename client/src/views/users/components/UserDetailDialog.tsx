'use client';

import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import type { User } from '../types';

const ROLE_LABELS: Record<string, { label: string; color: 'primary' | 'secondary' | 'success' | 'warning' | 'info' }> = {
  ADMIN: { label: 'Administrador', color: 'primary' },
  DOCTOR: { label: 'Doctor', color: 'info' },
  RECEPTIONIST: { label: 'Recepcionista', color: 'secondary' },
  PATIENT: { label: 'Paciente', color: 'success' },
  USER: { label: 'Usuario', color: 'warning' },
};

interface UserDetailDialogProps {
  user: User | null;
  onClose: () => void;
}

export function UserDetailDialog({ user, onClose }: UserDetailDialogProps) {
  if (!user) return null;

  const roleInfo = ROLE_LABELS[user.role] ?? { label: user.role, color: 'warning' as const };

  return (
    <Dialog open={!!user} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Typography variant="h6" component="div" fontWeight={600}>
          Detalle del Usuario
        </Typography>
        <IconButton size="small" onClick={onClose}>
          <i className="ri-close-line" style={{ fontSize: 22 }} />
        </IconButton>
      </DialogTitle>
      <Divider />
      <DialogContent sx={{ pt: 3 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight={600}>
              Nombre completo
            </Typography>
            <Typography variant="body1">
              {user.profile
                ? `${user.profile.name} ${user.profile.lastName}`
                : user.name}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', gap: 4 }}>
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                Email
              </Typography>
              <Typography variant="body2">{user.email}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                Teléfono
              </Typography>
              <Typography variant="body2">
                {user.profile?.phone ?? 'No registrado'}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', gap: 4 }}>
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                Rol
              </Typography>
              <Box sx={{ mt: 0.5 }}>
                <Chip
                  label={roleInfo.label}
                  color={roleInfo.color}
                  size="small"
                />
              </Box>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                Estado
              </Typography>
              <Box sx={{ mt: 0.5 }}>
                <Chip
                  label={user.isActive ? 'Activo' : 'Inactivo'}
                  color={user.isActive ? 'success' : 'error'}
                  size="small"
                />
              </Box>
            </Box>
          </Box>

          {user.profile?.typeDocument && user.profile?.numberDocument && (
            <Box sx={{ display: 'flex', gap: 4 }}>
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                  Tipo de Documento
                </Typography>
                <Typography variant="body2">{user.profile.typeDocument}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                  Nro. Documento
                </Typography>
                <Typography variant="body2">{user.profile.numberDocument}</Typography>
              </Box>
            </Box>
          )}

          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight={600}>
              Fecha de creación
            </Typography>
            <Typography variant="body2">
              {new Date(user.createdAt).toLocaleDateString('es-PE', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </Typography>
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
