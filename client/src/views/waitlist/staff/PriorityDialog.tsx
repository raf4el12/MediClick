'use client';

import { useState, useEffect } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import type { WaitlistEntry } from '../types';

interface PriorityDialogProps {
  entry: WaitlistEntry | null;
  onClose: () => void;
  onConfirm: (entryId: number, delta: number) => void;
  submitting: boolean;
}

export function PriorityDialog({ entry, onClose, onConfirm, submitting }: PriorityDialogProps) {
  const [delta, setDelta] = useState(10);

  useEffect(() => {
    if (entry) setDelta(10);
  }, [entry]);

  const valid = Number.isInteger(delta) && delta >= 1 && delta <= 100;

  return (
    <Dialog open={!!entry} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Subir prioridad</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
        {entry && (
          <Typography variant="body2" color="text.secondary">
            {entry.patientName} · {entry.specialtyName} · prioridad actual{' '}
            <b>{entry.priority}</b>
          </Typography>
        )}
        <TextField
          type="number"
          label="Sumar a la prioridad"
          value={delta}
          onChange={(e) => setDelta(Number(e.target.value))}
          inputProps={{ min: 1, max: 100 }}
          error={!valid}
          helperText={valid ? 'Mayor prioridad = atendido antes (1-100)' : 'Ingresa un valor entre 1 y 100'}
          fullWidth
          autoFocus
        />
        {entry && valid && (
          <Typography variant="caption" color="primary.main">
            Nueva prioridad: {entry.priority + delta}
          </Typography>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={submitting}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          disabled={!valid || submitting || !entry}
          onClick={() => entry && onConfirm(entry.id, delta)}
          startIcon={submitting ? <CircularProgress size={18} /> : <i className="ri-arrow-up-line" />}
        >
          Aplicar
        </Button>
      </DialogActions>
    </Dialog>
  );
}
