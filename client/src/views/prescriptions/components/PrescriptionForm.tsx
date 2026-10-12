'use client';

import { useState } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import type { CreatePrescriptionPayload, PrescriptionItemPayload } from '../types';

interface PrescriptionItemRow {
  medication: string;
  dosage: string;
  frequency: string;
  duration: string;
  notes: string;
}

const emptyItem = (): PrescriptionItemRow => ({
  medication: '',
  dosage: '',
  frequency: '',
  duration: '',
  notes: '',
});

const REQUIRED = [
  { key: 'dosage', label: 'Dosis' },
  { key: 'frequency', label: 'Frecuencia' },
  { key: 'duration', label: 'Duración' },
] as const;

interface PrescriptionFormProps {
  appointmentId: number;
  loading: boolean;
  onSubmit: (payload: CreatePrescriptionPayload) => Promise<unknown>;
}

export function PrescriptionForm({ appointmentId, loading, onSubmit }: PrescriptionFormProps) {
  const [instructions, setInstructions] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [items, setItems] = useState<PrescriptionItemRow[]>([emptyItem()]);
  const [formError, setFormError] = useState<string | null>(null);

  const updateItem = (index: number, field: keyof PrescriptionItemRow, value: string) => {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (items.length === 0) {
      setFormError('Agrega al menos un medicamento.');
      return;
    }

    const incomplete = items.findIndex((item) => !item.medication.trim() || !item.dosage.trim() || !item.frequency.trim() || !item.duration.trim());
    if (incomplete >= 0) {
      setFormError(`Al medicamento ${incomplete + 1} le faltan datos: medicamento, dosis, frecuencia y duración son obligatorios.`);
      return;
    }

    const mappedItems: PrescriptionItemPayload[] = items.map((item) => ({
      medication: item.medication.trim(),
      dosage: item.dosage.trim(),
      frequency: item.frequency.trim(),
      duration: item.duration.trim(),
      ...(item.notes.trim() ? { notes: item.notes.trim() } : {}),
    }));

    try {
      await onSubmit({
        appointmentId,
        ...(instructions.trim() ? { instructions: instructions.trim() } : {}),
        ...(validUntil ? { validUntil } : {}),
        items: mappedItems,
      });
    } catch {
      // El drawer muestra el mensaje del servidor.
    }
  };

  return (
    <form className='flex flex-col gap-4' onSubmit={(e) => void handleSubmit(e)}>
      <Typography variant='h6' component='h3'>
        Nueva receta
      </Typography>
      {formError && <Alert severity='warning'>{formError}</Alert>}
      <TextField
        id='receta-instrucciones'
        label='Instrucciones generales'
        value={instructions}
        onChange={(e) => setInstructions(e.target.value)}
        fullWidth
        multiline
        minRows={2}
        size='small'
        disabled={loading}
      />
      <TextField
        id='receta-valida-hasta'
        label='Válida hasta'
        type='date'
        value={validUntil}
        onChange={(e) => setValidUntil(e.target.value)}
        fullWidth
        size='small'
        disabled={loading}
        slotProps={{ inputLabel: { shrink: true } }}
      />
      <Typography variant='body2' color='text.secondary'>
        Medicamento, dosis, frecuencia y duración son obligatorios.
      </Typography>
      {items.map((item, index) => (
        <fieldset key={index} className='flex flex-col gap-3 m-0 p-4 rounded' style={{ border: '1px solid var(--mui-palette-divider)' }}>
          <div className='flex items-center justify-between'>
            <Typography component='legend' variant='subtitle2' className='p-0'>
              Medicamento {index + 1}
            </Typography>
            {items.length > 1 && (
              <IconButton size='small' aria-label={`Quitar medicamento ${index + 1}`} onClick={() => setItems((prev) => prev.filter((_, i) => i !== index))} disabled={loading}>
                <i className='ri-close-line' aria-hidden />
              </IconButton>
            )}
          </div>
          <TextField
            id={`receta-${index}-medicamento`}
            label='Medicamento'
            value={item.medication}
            onChange={(e) => updateItem(index, 'medication', e.target.value)}
            fullWidth
            size='small'
            disabled={loading}
          />
          <div className='grid gap-3 sm:grid-cols-3'>
            {REQUIRED.map(({ key, label }) => (
              <TextField
                key={key}
                id={`receta-${index}-${key}`}
                label={label}
                value={item[key]}
                onChange={(e) => updateItem(index, key, e.target.value)}
                fullWidth
                size='small'
                disabled={loading}
              />
            ))}
          </div>
          <TextField
            id={`receta-${index}-notas`}
            label='Notas (opcional)'
            value={item.notes}
            onChange={(e) => updateItem(index, 'notes', e.target.value)}
            fullWidth
            size='small'
            disabled={loading}
          />
        </fieldset>
      ))}
      <Button variant='outlined' size='small' className='self-start' onClick={() => setItems((prev) => [...prev, emptyItem()])} disabled={loading} startIcon={<i className='ri-add-line' aria-hidden />}>
        Agregar medicamento
      </Button>
      <Alert severity='info'>Al crear la receta, la cita queda completada.</Alert>
      <Button type='submit' variant='contained' disabled={loading} startIcon={loading ? <CircularProgress size={16} color='inherit' /> : undefined}>
        Crear receta
      </Button>
    </form>
  );
}
