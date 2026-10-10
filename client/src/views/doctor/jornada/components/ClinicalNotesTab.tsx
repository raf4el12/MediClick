'use client';

import { useState, type FormEvent } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Skeleton from '@mui/material/Skeleton';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import type { ClinicalNote, CreateClinicalNotePayload } from '@/views/clinical-notes/types';

interface ClinicalNotesTabProps {
  appointmentId: number;
  notes: ClinicalNote[];
  loading: boolean;
  busy: boolean;
  canWrite: boolean;
  onCreate: (payload: CreateClinicalNotePayload) => Promise<unknown>;
}

const FIELDS = [
  { key: 'diagnosis', label: 'Diagnóstico' },
  { key: 'summary', label: 'Resumen / anamnesis' },
  { key: 'plan', label: 'Plan de tratamiento' },
] as const;

export default function ClinicalNotesTab({ appointmentId, notes, loading, busy, canWrite, onCreate }: ClinicalNotesTabProps) {
  const [draft, setDraft] = useState({ diagnosis: '', summary: '', plan: '' });
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const filled = Object.fromEntries(Object.entries(draft).map(([k, v]) => [k, v.trim()]).filter(([, v]) => v));
    if (Object.keys(filled).length === 0) {
      setFormError('Completa al menos un campo.');
      return;
    }
    setFormError(null);
    try {
      await onCreate({ appointmentId, ...filled });
      setDraft({ diagnosis: '', summary: '', plan: '' });
    } catch {
      // El panel muestra el mensaje del servidor.
    }
  };

  if (loading) return <Skeleton variant='rounded' height={120} />;

  return (
    <div className='flex flex-col gap-4'>
      {notes.length === 0 && !canWrite && (
        <Typography color='text.secondary'>No hay notas clínicas para esta cita.</Typography>
      )}
      {notes.length > 0 && (
        <ul className='flex flex-col gap-3 m-0 p-0 list-none'>
          {notes.map((note) => (
            <li key={note.id} className='flex flex-col gap-1 p-3 rounded' style={{ border: '1px solid var(--mui-palette-divider)' }}>
              <Typography variant='caption' color='text.secondary'>
                {new Date(note.createdAt).toLocaleString('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </Typography>
              {FIELDS.map(({ key, label }) =>
                note[key] ? (
                  <Typography key={key} variant='body2'>
                    <strong>{label}:</strong> {note[key]}
                  </Typography>
                ) : null,
              )}
            </li>
          ))}
        </ul>
      )}
      {canWrite && (
        <form className='flex flex-col gap-3' onSubmit={(e) => void handleSubmit(e)}>
          {formError && <Alert severity='warning'>{formError}</Alert>}
          {FIELDS.map(({ key, label }) => (
            <TextField
              key={key}
              id={`nota-${key}`}
              label={label}
              value={draft[key]}
              onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))}
              multiline={key !== 'diagnosis'}
              minRows={2}
              size='small'
              disabled={busy}
            />
          ))}
          <Button type='submit' variant='contained' disabled={busy} className='self-start'>
            Guardar nota
          </Button>
        </form>
      )}
    </div>
  );
}
