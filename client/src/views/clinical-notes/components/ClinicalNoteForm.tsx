'use client';

import { useState } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import type { CreateClinicalNotePayload } from '../types';

interface ClinicalNoteFormProps {
  appointmentId: number;
  loading: boolean;
  onSubmit: (payload: CreateClinicalNotePayload) => Promise<unknown>;
}

export function ClinicalNoteForm({ appointmentId, loading, onSubmit }: ClinicalNoteFormProps) {
  const [diagnosis, setDiagnosis] = useState('');
  const [summary, setSummary] = useState('');
  const [plan, setPlan] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!diagnosis.trim() && !summary.trim() && !plan.trim()) {
      setFormError('Completa al menos un campo antes de guardar.');
      return;
    }

    const payload: CreateClinicalNotePayload = {
      appointmentId,
      ...(diagnosis.trim() ? { diagnosis: diagnosis.trim() } : {}),
      ...(summary.trim() ? { summary: summary.trim() } : {}),
      ...(plan.trim() ? { plan: plan.trim() } : {}),
    };

    try {
      await onSubmit(payload);
      setDiagnosis('');
      setSummary('');
      setPlan('');
    } catch {
      // El drawer muestra el mensaje del servidor.
    }
  };

  return (
    <form className='flex flex-col gap-4' onSubmit={(e) => void handleSubmit(e)}>
      <Typography variant='h6' component='h3'>
        Agregar nota
      </Typography>
      {formError && <Alert severity='warning'>{formError}</Alert>}
      <TextField id='nota-diagnostico' label='Diagnóstico' value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} fullWidth size='small' disabled={loading} />
      <TextField
        id='nota-resumen'
        label='Resumen / anamnesis'
        value={summary}
        onChange={(e) => setSummary(e.target.value)}
        fullWidth
        multiline
        minRows={3}
        size='small'
        disabled={loading}
      />
      <TextField
        id='nota-plan'
        label='Plan de tratamiento'
        value={plan}
        onChange={(e) => setPlan(e.target.value)}
        fullWidth
        multiline
        minRows={3}
        size='small'
        disabled={loading}
      />
      <Button type='submit' variant='contained' disabled={loading} startIcon={loading ? <CircularProgress size={16} color='inherit' /> : undefined}>
        Guardar nota
      </Button>
    </form>
  );
}
