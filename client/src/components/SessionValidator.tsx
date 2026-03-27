'use client';

import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import { useSessionValidator } from '@/hooks/useSessionValidator';

export default function SessionValidator() {
  const { showWarning, extendSession } = useSessionValidator();

  return (
    <Dialog open={showWarning} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <i className="ri-timer-line" style={{ fontSize: 22, color: 'var(--mui-palette-warning-main)' }} />
        Sesión por expirar
      </DialogTitle>
      <DialogContent>
        <DialogContentText>
          Tu sesión está a punto de expirar por inactividad. ¿Deseas continuar?
        </DialogContentText>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button variant="contained" onClick={extendSession}>
          Continuar sesión
        </Button>
      </DialogActions>
    </Dialog>
  );
}
