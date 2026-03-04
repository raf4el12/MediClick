'use client';

import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';

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

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {label}
      </Typography>
      <Box sx={{ mt: 0.5 }}>{children}</Box>
    </Box>
  );
}

export function MedicalHistoryDetail({ entry, open, onClose }: MedicalHistoryDetailProps) {
  if (!entry) return null;

  const statusCfg = STATUS_CONFIG[entry.status];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
        <Typography variant="h6" component="span" fontWeight={700}>
          Detalle del Historial
        </Typography>
        <IconButton size="small" onClick={onClose}>
          <i className="ri-close-line" style={{ fontSize: 20 }} />
        </IconButton>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ pt: 3 }}>
        <DetailRow label="Condición">
          <Typography variant="body1" fontWeight={600}>
            {entry.condition}
          </Typography>
        </DetailRow>

        <DetailRow label="Estado">
          <Chip label={statusCfg.label} color={statusCfg.color} size="small" />
        </DetailRow>

        <DetailRow label="Descripción">
          <Typography variant="body2">
            {entry.description || 'Sin descripción'}
          </Typography>
        </DetailRow>

        <DetailRow label="Fecha de Diagnóstico">
          <Typography variant="body2">
            {entry.diagnosedDate
              ? new Date(entry.diagnosedDate).toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })
              : 'No especificada'}
          </Typography>
        </DetailRow>

        <DetailRow label="Notas">
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
            {entry.notes || 'Sin notas'}
          </Typography>
        </DetailRow>

        <DetailRow label="Paciente">
          <Typography variant="body2">
            {entry.patient.name} {entry.patient.lastName}
          </Typography>
        </DetailRow>

        <Divider sx={{ my: 2 }} />

        <Box sx={{ display: 'flex', gap: 4 }}>
          <Box>
            <Typography variant="caption" color="text.disabled">
              Creado
            </Typography>
            <Typography variant="body2">
              {new Date(entry.createdAt).toLocaleString('es-ES')}
            </Typography>
          </Box>
          {entry.updatedAt && (
            <Box>
              <Typography variant="caption" color="text.disabled">
                Actualizado
              </Typography>
              <Typography variant="body2">
                {new Date(entry.updatedAt).toLocaleString('es-ES')}
              </Typography>
            </Box>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cerrar</Button>
      </DialogActions>
    </Dialog>
  );
}
