'use client';

import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import type { Doctor } from '../types';

interface DoctorDetailDialogProps {
  doctor: Doctor | null;
  onClose: () => void;
}

export function DoctorDetailDialog({ doctor, onClose }: DoctorDetailDialogProps) {
  if (!doctor) return null;

  return (
    <Dialog open={!!doctor} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Typography component="span" variant="h6" fontWeight={600}>
          Detalle del Doctor
        </Typography>
        <IconButton size="small" onClick={onClose}>
          <i className="ri-close-line" style={{ fontSize: 22 }} />
        </IconButton>
      </DialogTitle>
      <Divider />
      <DialogContent sx={{ pt: 3 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          {/* Nombre completo */}
          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight={600}>
              Nombre completo
            </Typography>
            <Typography variant="body1">
              {doctor.profile.name} {doctor.profile.lastName}
            </Typography>
          </Box>

          {/* Email y teléfono */}
          <Box sx={{ display: 'flex', gap: 4 }}>
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                Email
              </Typography>
              <Typography variant="body2">{doctor.profile.email}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                Teléfono
              </Typography>
              <Typography variant="body2">
                {doctor.profile.phone ?? 'No registrado'}
              </Typography>
            </Box>
          </Box>

          {/* CMP y género */}
          <Box sx={{ display: 'flex', gap: 4 }}>
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                CMP
              </Typography>
              <Typography variant="body2">{doctor.licenseNumber}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                Género
              </Typography>
              <Typography variant="body2">
                {doctor.profile.gender === 'M'
                  ? 'Masculino'
                  : doctor.profile.gender === 'F'
                    ? 'Femenino'
                    : 'No especificado'}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                Estado
              </Typography>
              <Box sx={{ mt: 0.5 }}>
                <Chip
                  label={doctor.isActive ? 'Activo' : 'Inactivo'}
                  color={doctor.isActive ? 'success' : 'error'}
                  size="small"
                />
              </Box>
            </Box>
          </Box>

          {/* Resumen */}
          {doctor.resume && (
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                Resumen profesional
              </Typography>
              <Typography variant="body2">{doctor.resume}</Typography>
            </Box>
          )}

          {/* Especialidades */}
          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ mb: 1, display: 'block' }}>
              Especialidades
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
              {doctor.specialties.map((spec) => (
                <Chip
                  key={spec.id}
                  label={spec.name}
                  size="small"
                  variant="outlined"
                  color="primary"
                />
              ))}
            </Box>
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
