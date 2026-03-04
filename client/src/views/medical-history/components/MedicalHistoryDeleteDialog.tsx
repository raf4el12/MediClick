'use client';

import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

import type { MedicalHistory } from '../types';

interface MedicalHistoryDeleteDialogProps {
  entry: MedicalHistory | null;
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  submitting: boolean;
}

export function MedicalHistoryDeleteDialog({
  entry,
  open,
  onClose,
  onConfirm,
  submitting,
}: MedicalHistoryDeleteDialogProps) {
  if (!entry) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>Eliminar Entrada</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary">
          ¿Estás seguro de que deseas eliminar la entrada{' '}
          <strong>&quot;{entry.condition}&quot;</strong>? Esta acción no se puede deshacer.
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={submitting}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          color="error"
          onClick={onConfirm}
          disabled={submitting}
          startIcon={submitting ? <CircularProgress size={18} /> : null}
        >
          Eliminar
        </Button>
      </DialogActions>
    </Dialog>
  );
}
