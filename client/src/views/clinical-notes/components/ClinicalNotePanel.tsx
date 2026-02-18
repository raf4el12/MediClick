'use client';

import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';
import Alert from '@mui/material/Alert';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import type { Appointment } from '@/views/appointments/types';
import type { ClinicalNote, CreateClinicalNotePayload } from '../types';
import { ClinicalNoteForm } from './ClinicalNoteForm';

function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr);

  return date.toLocaleString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface ClinicalNotePanelProps {
  appointment: Appointment | null;
  notes: ClinicalNote[];
  loadingNotes: boolean;
  loadingCreate: boolean;
  panelError: string | null;
  onClose: () => void;
  onCreateNote: (payload: CreateClinicalNotePayload) => Promise<void>;
}

export function ClinicalNotePanel({
  appointment,
  notes,
  loadingNotes,
  loadingCreate,
  panelError,
  onClose,
  onCreateNote,
}: ClinicalNotePanelProps) {
  if (!appointment) {
    return (
      <Card sx={{ position: 'sticky', top: 80, height: '100%' }}>
        <CardContent
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            py: 8,
            textAlign: 'center',
          }}
        >
          <i className="ri-file-text-line" style={{ fontSize: 48, opacity: 0.3 }} />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Selecciona una cita para ver sus notas clínicas
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card sx={{ position: 'sticky', top: 80 }}>
      <CardHeader
        title={
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            {appointment.patient.name} {appointment.patient.lastName}
          </Typography>
        }
        subheader={
          <Typography variant="caption" color="text.secondary">
            {appointment.schedule.specialty.name} — {appointment.schedule.scheduleDate}
          </Typography>
        }
        action={
          <IconButton size="small" onClick={onClose}>
            <i className="ri-close-line" style={{ fontSize: 18 }} />
          </IconButton>
        }
      />

      <Divider />

      <CardContent>
        {panelError ? (
          <Alert severity="error">{panelError}</Alert>
        ) : loadingNotes ? (
          <>
            <Skeleton variant="rectangular" height={80} sx={{ mb: 2, borderRadius: 1 }} />
            <Skeleton variant="rectangular" height={80} sx={{ mb: 2, borderRadius: 1 }} />
          </>
        ) : (
          <>
            {notes.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                No hay notas clínicas para esta cita.
              </Typography>
            ) : (
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5 }}>
                  Notas registradas ({notes.length})
                </Typography>
                {notes.map((note, idx) => (
                  <Box
                    key={note.id}
                    sx={{
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1,
                      p: 2,
                      mb: 1.5,
                    }}
                  >
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                      Nota #{idx + 1} — {formatDateTime(note.createdAt)}
                    </Typography>

                    {note.diagnosis && (
                      <Box sx={{ mb: 1 }}>
                        <Typography variant="caption" color="text.secondary">
                          Diagnóstico
                        </Typography>
                        <Typography variant="body2">{note.diagnosis}</Typography>
                      </Box>
                    )}

                    {note.summary && (
                      <Box sx={{ mb: 1 }}>
                        <Typography variant="caption" color="text.secondary">
                          Resumen / Anamnesis
                        </Typography>
                        <Typography variant="body2">{note.summary}</Typography>
                      </Box>
                    )}

                    {note.plan && (
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Plan de tratamiento
                        </Typography>
                        <Typography variant="body2">{note.plan}</Typography>
                      </Box>
                    )}
                  </Box>
                ))}
              </Box>
            )}

            <Divider sx={{ mb: 2 }} />

            <ClinicalNoteForm
              appointmentId={appointment.id}
              loading={loadingCreate}
              onSubmit={onCreateNote}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}
