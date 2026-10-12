'use client';

import { useState } from 'react';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import type { WaitlistEntry } from '../types';

interface PriorityDialogProps {
  entry: WaitlistEntry | null;
  onClose: () => void;
  onConfirm: (entryId: number, delta: number) => void;
  submitting: boolean;
}

const DEFAULT_DELTA = 10;

/** Sube la prioridad de espera de una entrada (mismo payload que antes: `{ delta }` de 1 a 100). */
export function PriorityDialog({ entry, onClose, onConfirm, submitting }: PriorityDialogProps) {
  const [delta, setDelta] = useState(DEFAULT_DELTA);
  const [prevId, setPrevId] = useState(entry?.id);
  if (entry?.id !== prevId) {
    setPrevId(entry?.id);
    setDelta(DEFAULT_DELTA);
  }

  const valid = Number.isInteger(delta) && delta >= 1 && delta <= 100;

  return (
    <Dialog open={!!entry} onClose={onClose} maxWidth='xs' fullWidth aria-labelledby='prioridad-titulo'>
      <DialogTitle id='prioridad-titulo' className='flex flex-col gap-1'>
        Subir prioridad
        {entry && (
          <Typography component='span' color='text.secondary'>
            {entry.patientName} · {entry.specialtyName} · prioridad actual {entry.priority}
          </Typography>
        )}
      </DialogTitle>
      <DialogContent className='flex flex-col gap-3'>
        <TextField
          id='prioridad-delta'
          type='number'
          label='Sumar a la prioridad'
          value={delta}
          onChange={(e) => setDelta(Number(e.target.value))}
          error={!valid}
          helperText={valid ? 'Mayor prioridad, antes se ofrece un cupo (1 a 100).' : 'Ingresa un valor entre 1 y 100.'}
          slotProps={{ htmlInput: { min: 1, max: 100 } }}
          className='mbs-2'
          autoFocus
        />
        {entry && valid && <Typography color='text.primary'>Nueva prioridad: {entry.priority + delta}</Typography>}
      </DialogContent>
      <DialogActions>
        <Button variant='outlined' onClick={onClose} disabled={submitting}>
          Cancelar
        </Button>
        <Button
          variant='contained'
          disabled={!valid || submitting || !entry}
          onClick={() => entry && onConfirm(entry.id, delta)}
          startIcon={submitting ? <CircularProgress size={18} color='inherit' /> : <i className='ri-arrow-up-line' aria-hidden />}
        >
          Aplicar
        </Button>
      </DialogActions>
    </Dialog>
  );
}
