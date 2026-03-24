'use client';

import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import { alpha, useTheme } from '@mui/material/styles';

import type { MedicalHistory } from '../types';
import { MedicalHistoryStatus } from '../types';

const STATUS_CONFIG: Record<MedicalHistoryStatus, { label: string; color: 'info' | 'warning' | 'success' }> = {
  [MedicalHistoryStatus.ACTIVE]: { label: 'Activa', color: 'info' },
  [MedicalHistoryStatus.CHRONIC]: { label: 'Crónica', color: 'warning' },
  [MedicalHistoryStatus.RESOLVED]: { label: 'Resuelta', color: 'success' },
};

interface MedicalHistoryDetailProps {
  entry: MedicalHistory | null;
  open: boolean;
  onClose: () => void;
}

function InfoRow({ icon, label, children }: { icon: string; label: string; children: React.ReactNode }) {
  const theme = useTheme();

  return (
    <Box sx={{ display: 'flex', gap: 1.5, mb: 2.5 }}>
      <Box
        sx={{
          width: 30,
          height: 30,
          borderRadius: 1,
          bgcolor: alpha(theme.palette.primary.main, 0.08),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          mt: 0.25,
        }}
      >
        <i className={icon} style={{ fontSize: 16, color: theme.palette.primary.main }} />
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="caption" color="text.secondary" fontWeight={600}>
          {label}
        </Typography>
        <Box sx={{ mt: 0.25 }}>{children}</Box>
      </Box>
    </Box>
  );
}

export function MedicalHistoryDetail({ entry, open, onClose }: MedicalHistoryDetailProps) {
  const theme = useTheme();

  if (!entry) return null;

  const statusCfg = STATUS_CONFIG[entry.status];
  const statusColor = theme.palette[statusCfg.color].main;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      {/* Header con acento de color */}
      <Box
        sx={{
          px: 3,
          pt: 2.5,
          pb: 2,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          borderBottom: `3px solid ${statusColor}`,
        }}
      >
        <Box sx={{ flex: 1, mr: 2 }}>
          <Typography variant="h6" component="span" fontWeight={700} sx={{ mb: 0.5, display: 'block' }}>
            {entry.condition}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.75 }}>
            <Chip label={statusCfg.label} color={statusCfg.color} size="small" />
            <Typography variant="caption" color="text.disabled">
              ID #{entry.id}
            </Typography>
          </Box>
        </Box>
        <IconButton size="small" onClick={onClose} sx={{ mt: -0.5 }}>
          <i className="ri-close-line" style={{ fontSize: 20 }} />
        </IconButton>
      </Box>

      <DialogContent sx={{ pt: 3, pb: 1 }}>
        <InfoRow icon="ri-file-text-line" label="Descripción">
          <Typography variant="body2" sx={{ lineHeight: 1.6 }}>
            {entry.description || 'Sin descripción'}
          </Typography>
        </InfoRow>

        <InfoRow icon="ri-calendar-check-line" label="Fecha de Diagnóstico">
          <Typography variant="body2">
            {entry.diagnosedDate
              ? new Date(entry.diagnosedDate).toLocaleDateString('es-PE', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  timeZone: 'UTC',
                })
              : 'No especificada'}
          </Typography>
        </InfoRow>

        <InfoRow icon="ri-sticky-note-line" label="Notas">
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
            {entry.notes || 'Sin notas'}
          </Typography>
        </InfoRow>

        <InfoRow icon="ri-user-heart-line" label="Paciente">
          <Typography variant="body2" fontWeight={500}>
            {entry.patient.name} {entry.patient.lastName}
          </Typography>
        </InfoRow>

        <Divider sx={{ my: 1.5 }} />

        <Box sx={{ display: 'flex', gap: 4, py: 1 }}>
          <Box>
            <Typography variant="caption" color="text.disabled" fontWeight={600}>
              Creado
            </Typography>
            <Typography variant="body2" sx={{ mt: 0.25 }}>
              {new Date(entry.createdAt).toLocaleDateString('es-PE', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Typography>
          </Box>
          {entry.updatedAt && (
            <Box>
              <Typography variant="caption" color="text.disabled" fontWeight={600}>
                Actualizado
              </Typography>
              <Typography variant="body2" sx={{ mt: 0.25 }}>
                {new Date(entry.updatedAt).toLocaleDateString('es-PE', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Typography>
            </Box>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} variant="outlined" size="small">
          Cerrar
        </Button>
      </DialogActions>
    </Dialog>
  );
}
