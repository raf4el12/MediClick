'use client';

import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import { alpha, useTheme } from '@mui/material/styles';

import type { ScheduleBlock } from '../types';

interface ScheduleBlockDeleteDialogProps {
  entry: ScheduleBlock | null;
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  submitting: boolean;
}

export function ScheduleBlockDeleteDialog({
  entry,
  open,
  onClose,
  onConfirm,
  submitting,
}: ScheduleBlockDeleteDialogProps) {
  const theme = useTheme();

  if (!entry) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogContent sx={{ textAlign: 'center', pt: 4, pb: 2 }}>
        <Box
          sx={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            bgcolor: alpha(theme.palette.error.main, 0.1),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mx: 'auto',
            mb: 2.5,
          }}
        >
          <i className="ri-delete-bin-line" style={{ fontSize: 28, color: theme.palette.error.main }} />
        </Box>
        <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
          Eliminar Bloqueo
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
          ¿Estás seguro de que deseas eliminar el bloqueo{' '}
          <strong>&quot;{entry.reason}&quot;</strong>?
          <br />
          Esta acción no se puede deshacer.
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5, justifyContent: 'center', gap: 1 }}>
        <Button onClick={onClose} disabled={submitting} variant="outlined" size="small">
          Cancelar
        </Button>
        <Button
          variant="contained"
          color="error"
          onClick={onConfirm}
          disabled={submitting}
          startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : null}
          size="small"
        >
          Eliminar
        </Button>
      </DialogActions>
    </Dialog>
  );
}
