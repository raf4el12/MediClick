'use client';

import { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Typography from '@mui/material/Typography';
import type { CreateClinicalNotePayload } from '../types';

interface ClinicalNoteFormProps {
  appointmentId: number;
  loading: boolean;
  onSubmit: (payload: CreateClinicalNotePayload) => Promise<void>;
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
      setFormError('Debes completar al menos un campo antes de guardar.');

      return;
    }

    const payload: CreateClinicalNotePayload = {
      appointmentId,
      ...(diagnosis.trim() ? { diagnosis: diagnosis.trim() } : {}),
      ...(summary.trim() ? { summary: summary.trim() } : {}),
      ...(plan.trim() ? { plan: plan.trim() } : {}),
    };

    await onSubmit(payload);
    setDiagnosis('');
    setSummary('');
    setPlan('');
  };

  return (
    <Box component="form" onSubmit={(e) => { void handleSubmit(e); }} sx={{ mt: 1 }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5 }}>
        Agregar nueva nota
      </Typography>

      {formError && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {formError}
        </Alert>
      )}

      <TextField
        label="Diagnóstico"
        value={diagnosis}
        onChange={(e) => setDiagnosis(e.target.value)}
        fullWidth
        size="small"
        sx={{ mb: 2 }}
        disabled={loading}
      />

      <TextField
        label="Resumen / Anamnesis"
        value={summary}
        onChange={(e) => setSummary(e.target.value)}
        fullWidth
        multiline
        minRows={3}
        size="small"
        sx={{ mb: 2 }}
        disabled={loading}
      />

      <TextField
        label="Plan de tratamiento"
        value={plan}
        onChange={(e) => setPlan(e.target.value)}
        fullWidth
        multiline
        minRows={3}
        size="small"
        sx={{ mb: 2 }}
        disabled={loading}
      />

      <Button
        type="submit"
        variant="contained"
        fullWidth
        disabled={loading}
        startIcon={loading ? <CircularProgress size={16} color="inherit" /> : undefined}
      >
        {loading ? 'Guardando...' : 'Guardar Nota'}
      </Button>
    </Box>
  );
}
