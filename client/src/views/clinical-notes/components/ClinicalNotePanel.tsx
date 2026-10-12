'use client';

import Alert from '@mui/material/Alert';
import Divider from '@mui/material/Divider';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import { formatDate } from '@/utils/formatDate';
import type { ClinicalNote, CreateClinicalNotePayload } from '../types';
import { ClinicalNoteForm } from './ClinicalNoteForm';

interface ClinicalNotePanelProps {
  appointmentId: number;
  notes: ClinicalNote[];
  loadingNotes: boolean;
  loadingCreate: boolean;
  panelError: string | null;
  createError: string | null;
  onCreateNote: (payload: CreateClinicalNotePayload) => Promise<unknown>;
}

const FIELDS = [
  { key: 'diagnosis', label: 'Diagnóstico' },
  { key: 'summary', label: 'Resumen / anamnesis' },
  { key: 'plan', label: 'Plan de tratamiento' },
] as const;

/** Contenido del drawer de notas: notas de la cita y alta de una nota nueva. */
export function ClinicalNotePanel({ appointmentId, notes, loadingNotes, loadingCreate, panelError, createError, onCreateNote }: ClinicalNotePanelProps) {
  if (panelError) return <Alert severity='error'>{panelError}</Alert>;

  if (loadingNotes) {
    return (
      <div className='flex flex-col gap-3'>
        <Skeleton variant='rounded' height={80} />
        <Skeleton variant='rounded' height={80} />
      </div>
    );
  }

  return (
    <div className='flex flex-col gap-5'>
      {notes.length === 0 ? (
        <Typography color='text.secondary'>No hay notas clínicas para esta cita.</Typography>
      ) : (
        <section aria-labelledby='notas-registradas' className='flex flex-col gap-3'>
          <Typography id='notas-registradas' variant='h6' component='h3'>
            Notas registradas ({notes.length})
          </Typography>
          <ul className='flex flex-col gap-3 m-0 p-0 list-none'>
            {notes.map((note, idx) => (
              <li key={note.id} className='flex flex-col gap-1 p-3 rounded' style={{ border: '1px solid var(--mui-palette-divider)' }}>
                <Typography variant='caption' color='text.secondary'>
                  Nota {idx + 1} · {formatDate(note.createdAt, { time: true })}
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
        </section>
      )}
      <Divider />
      {createError && <Alert severity='error'>{createError}</Alert>}
      <ClinicalNoteForm key={appointmentId} appointmentId={appointmentId} loading={loadingCreate} onSubmit={onCreateNote} />
    </div>
  );
}
