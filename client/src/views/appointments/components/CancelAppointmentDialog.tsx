'use client';

import { useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import type { Appointment } from '../types';

interface CancelAppointmentDialogProps {
  open: boolean;
  appointment: Appointment | null;
  onClose: () => void;
  onConfirm: (id: number, reason: string) => void;
}

export function CancelAppointmentDialog({
  open,
  appointment,
  onClose,
  onConfirm,
}: CancelAppointmentDialogProps) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const handleClose = () => {
    setReason('');
    setError('');
    onClose();
  };

  const handleConfirm = () => {
    if (reason.length < 5) {
      setError('El motivo debe tener al menos 5 caracteres');
      return;
    }
    if (appointment) {
      onConfirm(appointment.id, reason);
      setReason('');
      setError('');
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle>Cancelar Cita</DialogTitle>
      <DialogContent>
        {appointment && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Cancelar cita de {appointment.patient.name} {appointment.patient.lastName}
          </Typography>
        )}
        <TextField
          fullWidth
          label="Motivo de cancelación"
          multiline
          rows={3}
          value={reason}
          onChange={(e) => {
            setReason(e.target.value);
            if (error) setError('');
          }}
          error={!!error}
          helperText={error}
          placeholder="Ingrese el motivo de la cancelación..."
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} color="inherit">
          Volver
        </Button>
        <Button
          variant="contained"
          color="error"
          onClick={handleConfirm}
          disabled={!reason.trim()}
        >
          Confirmar Cancelación
        </Button>
      </DialogActions>
    </Dialog>
  );
}
