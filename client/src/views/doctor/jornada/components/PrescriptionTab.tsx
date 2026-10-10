'use client';

import { useState, type FormEvent } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Skeleton from '@mui/material/Skeleton';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import type { CreatePrescriptionPayload, Prescription, PrescriptionItemPayload } from '@/views/prescriptions/types';

interface PrescriptionTabProps {
  appointmentId: number;
  prescription: Prescription | null;
  loading: boolean;
  busy: boolean;
  canWrite: boolean;
  onCreate: (payload: CreatePrescriptionPayload) => Promise<unknown>;
}

const EMPTY_ITEM: PrescriptionItemPayload = { medication: '', dosage: '', frequency: '', duration: '' };
const ITEM_FIELDS = [
  { key: 'dosage', label: 'Dosis', placeholder: '500 mg' },
  { key: 'frequency', label: 'Frecuencia', placeholder: 'Cada 8 horas' },
  { key: 'duration', label: 'Duración', placeholder: '7 días' },
] as const;

export default function PrescriptionTab({ appointmentId, prescription, loading, busy, canWrite, onCreate }: PrescriptionTabProps) {
  const [instructions, setInstructions] = useState('');
  const [items, setItems] = useState<PrescriptionItemPayload[]>([EMPTY_ITEM]);
  const [formError, setFormError] = useState<string | null>(null);

  const update = (index: number, field: keyof PrescriptionItemPayload, value: string) =>
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const valid = items.filter((it) => it.medication.trim());
    if (valid.length === 0) {
      setFormError('Agrega al menos un medicamento.');
      return;
    }
    setFormError(null);
    try {
      await onCreate({
        appointmentId,
        instructions: instructions.trim() || undefined,
        items: valid.map((it) => ({
          medication: it.medication.trim(),
          dosage: it.dosage.trim(),
          frequency: it.frequency.trim(),
          duration: it.duration.trim(),
        })),
      });
      setInstructions('');
      setItems([EMPTY_ITEM]);
    } catch {
      // El panel muestra el mensaje del servidor.
    }
  };

  if (loading) return <Skeleton variant='rounded' height={120} />;

  if (prescription) {
    return (
      <div className='flex flex-col gap-3'>
        <Typography variant='subtitle2'>
          Receta del {new Date(prescription.createdAt).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })}
        </Typography>
        {prescription.instructions && <Typography variant='body2'>{prescription.instructions}</Typography>}
        <ol className='flex flex-col gap-2 m-0 ps-5'>
          {prescription.items.map((item) => (
            <li key={item.id}>
              <Typography variant='body2'>
                <strong>{item.medication}</strong> · {item.dosage} · {item.frequency} · {item.duration}
              </Typography>
            </li>
          ))}
        </ol>
      </div>
    );
  }

  if (!canWrite) return <Typography color='text.secondary'>No hay receta para esta cita.</Typography>;

  return (
    <form className='flex flex-col gap-3' onSubmit={(e) => void handleSubmit(e)}>
      {formError && <Alert severity='warning'>{formError}</Alert>}
      <TextField id='receta-indicaciones' label='Indicaciones generales' value={instructions} onChange={(e) => setInstructions(e.target.value)} multiline minRows={2} size='small' disabled={busy} />
      {items.map((item, index) => (
        <fieldset key={index} className='flex flex-col gap-2 m-0 p-3 rounded' style={{ border: '1px solid var(--mui-palette-divider)' }}>
          <legend className='sr-only'>Medicamento {index + 1}</legend>
          <div className='flex items-start gap-2'>
            <TextField id={`receta-${index}-medicamento`} label='Medicamento' value={item.medication} onChange={(e) => update(index, 'medication', e.target.value)} size='small' fullWidth disabled={busy} />
            {items.length > 1 && (
              <IconButton aria-label={`Quitar medicamento ${index + 1}`} onClick={() => setItems((prev) => prev.filter((_, i) => i !== index))}>
                <i className='ri-close-line' />
              </IconButton>
            )}
          </div>
          <div className='grid gap-2 sm:grid-cols-3'>
            {ITEM_FIELDS.map(({ key, label, placeholder }) => (
              <TextField key={key} id={`receta-${index}-${key}`} label={label} placeholder={placeholder} value={item[key]} onChange={(e) => update(index, key, e.target.value)} size='small' disabled={busy} />
            ))}
          </div>
        </fieldset>
      ))}
      <div className='flex flex-wrap gap-2'>
        <Button variant='outlined' onClick={() => setItems((prev) => [...prev, EMPTY_ITEM])} startIcon={<i className='ri-add-line' />}>
          Agregar medicamento
        </Button>
        <Button type='submit' variant='contained' disabled={busy}>
          Guardar receta
        </Button>
      </div>
    </form>
  );
}
