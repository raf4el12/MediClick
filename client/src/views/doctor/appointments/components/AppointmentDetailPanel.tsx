'use client';

import { useState } from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import Alert from '@mui/material/Alert';
import Skeleton from '@mui/material/Skeleton';
import CircularProgress from '@mui/material/CircularProgress';
import Grid from '@mui/material/Grid';
import { alpha, useTheme } from '@mui/material/styles';
import type { Appointment } from '@/views/appointments/types';
import { AppointmentStatus } from '@/views/appointments/types';
import type { ClinicalNote, CreateClinicalNotePayload } from '@/views/clinical-notes/types';
import type { Prescription, CreatePrescriptionPayload, PrescriptionItemPayload } from '@/views/prescriptions/types';

interface AppointmentDetailPanelProps {
  appointment: Appointment | null;
  notes: ClinicalNote[];
  prescription: Prescription | null;
  loadingNotes: boolean;
  loadingPrescription: boolean;
  actionLoading: boolean;
  actionError: string | null;
  onClose: () => void;
  onComplete: (id: number) => Promise<void>;
  onCreateNote: (payload: CreateClinicalNotePayload) => Promise<void>;
  onCreatePrescription: (payload: CreatePrescriptionPayload) => Promise<void>;
}

export function AppointmentDetailPanel({
  appointment,
  notes,
  prescription,
  loadingNotes,
  loadingPrescription,
  actionLoading,
  actionError,
  onClose,
  onComplete,
  onCreateNote,
  onCreatePrescription,
}: AppointmentDetailPanelProps) {
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState(0);

  if (!appointment) {
    return (
      <Card sx={{ position: 'sticky', top: 80, height: '100%' }}>
        <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 8, textAlign: 'center' }}>
          <i className="ri-stethoscope-line" style={{ fontSize: 48, opacity: 0.3 }} />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Selecciona una cita para ver los detalles y gestionar la consulta
          </Typography>
        </CardContent>
      </Card>
    );
  }

  const isInProgress = appointment.status === AppointmentStatus.IN_PROGRESS;
  const isCompleted = appointment.status === AppointmentStatus.COMPLETED;
  const canWrite = isInProgress || isCompleted;

  return (
    <Card sx={{ position: 'sticky', top: 80 }}>
      <CardHeader
        title={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="subtitle1" fontWeight={700}>
              {appointment.patient.name} {appointment.patient.lastName}
            </Typography>
            <Chip
              label={isInProgress ? 'En Consulta' : isCompleted ? 'Completada' : appointment.status}
              color={isInProgress ? 'info' : isCompleted ? 'success' : 'default'}
              size="small"
            />
          </Box>
        }
        subheader={
          <Typography variant="caption" color="text.secondary">
            {appointment.schedule.specialty.name} — {appointment.startTime} a {appointment.endTime}
          </Typography>
        }
        action={
          <IconButton size="small" aria-label="Cerrar panel de cita" onClick={onClose}>
            <i className="ri-close-line" style={{ fontSize: 18 }} />
          </IconButton>
        }
      />

      <Divider />

      {/* Patient info */}
      <Box sx={{ px: 3, py: 1.5, bgcolor: alpha(theme.palette.primary.main, 0.03) }}>
        <Typography variant="caption" color="text.secondary">Email: </Typography>
        <Typography variant="caption">{appointment.patient.email}</Typography>
        {appointment.reason && (
          <>
            <Typography variant="caption" color="text.secondary" sx={{ ml: 2 }}>Motivo: </Typography>
            <Typography variant="caption">{appointment.reason}</Typography>
          </>
        )}
      </Box>

      {actionError && <Alert severity="error" sx={{ mx: 2, mt: 1 }}>{actionError}</Alert>}

      {/* Complete button */}
      {isInProgress && (
        <Box sx={{ px: 3, py: 1.5 }}>
          <Button
            variant="contained"
            color="success"
            fullWidth
            onClick={() => void onComplete(appointment.id)}
            disabled={actionLoading}
            startIcon={actionLoading ? <CircularProgress size={16} color="inherit" /> : <i className="ri-check-double-line" style={{ fontSize: 18 }} />}
          >
            Completar Consulta
          </Button>
        </Box>
      )}

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onChange={(_, v) => setActiveTab(v)}
        sx={{ px: 2, borderBottom: '1px solid', borderColor: 'divider' }}
        variant="fullWidth"
      >
        <Tab
          label={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <i className="ri-file-text-line" style={{ fontSize: 14 }} />
              <span>Notas</span>
              {notes.length > 0 && (
                <Chip label={notes.length} size="small" color="primary" sx={{ height: 18, minWidth: 18, '& .MuiChip-label': { px: 0.5, fontSize: '0.7rem' } }} />
              )}
            </Box>
          }
        />
        <Tab
          label={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <i className="ri-medicine-bottle-line" style={{ fontSize: 14 }} />
              <span>Receta</span>
              {prescription && (
                <i className="ri-check-line" style={{ fontSize: 14, color: theme.palette.success.main }} />
              )}
            </Box>
          }
        />
      </Tabs>

      <CardContent sx={{ maxHeight: 'calc(100vh - 400px)', overflow: 'auto' }}>
        {activeTab === 0 && (
          <NotesSection
            appointmentId={appointment.id}
            notes={notes}
            loading={loadingNotes}
            actionLoading={actionLoading}
            canWrite={canWrite}
            onCreateNote={onCreateNote}
          />
        )}
        {activeTab === 1 && (
          <PrescriptionSection
            appointmentId={appointment.id}
            prescription={prescription}
            loading={loadingPrescription}
            actionLoading={actionLoading}
            canWrite={canWrite && !prescription}
            onCreatePrescription={onCreatePrescription}
          />
        )}
      </CardContent>
    </Card>
  );
}

// ── Notes Section ──

function NotesSection({
  appointmentId,
  notes,
  loading,
  actionLoading,
  canWrite,
  onCreateNote,
}: {
  appointmentId: number;
  notes: ClinicalNote[];
  loading: boolean;
  actionLoading: boolean;
  canWrite: boolean;
  onCreateNote: (p: CreateClinicalNotePayload) => Promise<void>;
}) {
  const [diagnosis, setDiagnosis] = useState('');
  const [summary, setSummary] = useState('');
  const [plan, setPlan] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!diagnosis.trim() && !summary.trim() && !plan.trim()) {
      setFormError('Completa al menos un campo.');
      return;
    }
    await onCreateNote({
      appointmentId,
      ...(diagnosis.trim() ? { diagnosis: diagnosis.trim() } : {}),
      ...(summary.trim() ? { summary: summary.trim() } : {}),
      ...(plan.trim() ? { plan: plan.trim() } : {}),
    });
    setDiagnosis('');
    setSummary('');
    setPlan('');
  };

  if (loading) {
    return <Skeleton variant="rectangular" height={80} sx={{ borderRadius: 1 }} />;
  }

  return (
    <>
      {notes.map((note, idx) => (
        <Box key={note.id} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5, p: 1.5, mb: 1.5 }}>
          <Typography variant="caption" color="text.secondary">
            #{idx + 1} — {new Date(note.createdAt).toLocaleString('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
          </Typography>
          {note.diagnosis && <Typography variant="body2" sx={{ mt: 0.5 }}><strong>Dx:</strong> {note.diagnosis}</Typography>}
          {note.summary && <Typography variant="body2"><strong>Resumen:</strong> {note.summary}</Typography>}
          {note.plan && <Typography variant="body2"><strong>Plan:</strong> {note.plan}</Typography>}
        </Box>
      ))}

      {canWrite && (
        <Box component="form" onSubmit={(e) => { void handleSubmit(e); }} sx={{ mt: notes.length > 0 ? 2 : 0 }}>
          {notes.length > 0 && <Divider sx={{ mb: 2 }} />}
          <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
            Nueva nota
          </Typography>
          {formError && <Alert severity="warning" sx={{ mb: 1 }}>{formError}</Alert>}
          <TextField label="Diagnostico" value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} fullWidth size="small" sx={{ mb: 1.5 }} disabled={actionLoading} />
          <TextField label="Resumen" value={summary} onChange={(e) => setSummary(e.target.value)} fullWidth multiline minRows={2} size="small" sx={{ mb: 1.5 }} disabled={actionLoading} />
          <TextField label="Plan" value={plan} onChange={(e) => setPlan(e.target.value)} fullWidth multiline minRows={2} size="small" sx={{ mb: 1.5 }} disabled={actionLoading} />
          <Button type="submit" variant="contained" size="small" fullWidth disabled={actionLoading}
            startIcon={actionLoading ? <CircularProgress size={14} color="inherit" /> : undefined}>
            {actionLoading ? 'Guardando...' : 'Guardar Nota'}
          </Button>
        </Box>
      )}

      {!canWrite && notes.length === 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
          Sin notas clínicas
        </Typography>
      )}
    </>
  );
}

// ── Prescription Section ──

function PrescriptionSection({
  appointmentId,
  prescription,
  loading,
  actionLoading,
  canWrite,
  onCreatePrescription,
}: {
  appointmentId: number;
  prescription: Prescription | null;
  loading: boolean;
  actionLoading: boolean;
  canWrite: boolean;
  onCreatePrescription: (p: CreatePrescriptionPayload) => Promise<void>;
}) {
  const theme = useTheme();
  const [instructions, setInstructions] = useState('');
  const [items, setItems] = useState<PrescriptionItemPayload[]>([
    { medication: '', dosage: '', frequency: '', duration: '' },
  ]);
  const [formError, setFormError] = useState<string | null>(null);

  const updateItem = (idx: number, field: keyof PrescriptionItemPayload, value: string) => {
    setItems((prev) => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const valid = items.filter((it) => it.medication.trim());
    if (valid.length === 0) {
      setFormError('Agrega al menos un medicamento.');
      return;
    }
    await onCreatePrescription({
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
    setItems([{ medication: '', dosage: '', frequency: '', duration: '' }]);
  };

  if (loading) return <Skeleton variant="rectangular" height={80} sx={{ borderRadius: 1 }} />;

  if (prescription) {
    return (
      <>
        {prescription.instructions && (
          <Box sx={{ mb: 1.5, p: 1.5, bgcolor: alpha(theme.palette.info.main, 0.05), borderRadius: 1.5 }}>
            <Typography variant="caption" color="text.secondary">Instrucciones</Typography>
            <Typography variant="body2">{prescription.instructions}</Typography>
          </Box>
        )}
        {prescription.items.map((item, idx) => (
          <Box key={item.id} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5, p: 1.5, mb: 1 }}>
            <Typography variant="subtitle2" fontWeight={600}>{idx + 1}. {item.medication}</Typography>
            <Typography variant="caption" color="text.secondary">
              {item.dosage} — {item.frequency} — {item.duration}
            </Typography>
            {item.notes && <Typography variant="caption" color="text.disabled" sx={{ display: 'block' }}>{item.notes}</Typography>}
          </Box>
        ))}
      </>
    );
  }

  if (!canWrite) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
        Sin receta
      </Typography>
    );
  }

  return (
    <Box component="form" onSubmit={(e) => { void handleSubmit(e); }}>
      <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>Crear receta</Typography>
      {formError && <Alert severity="warning" sx={{ mb: 1 }}>{formError}</Alert>}
      <TextField label="Instrucciones" value={instructions} onChange={(e) => setInstructions(e.target.value)} fullWidth multiline minRows={2} size="small" sx={{ mb: 2 }} disabled={actionLoading} />

      {items.map((item, idx) => (
        <Box key={idx} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5, p: 1.5, mb: 1.5, position: 'relative' }}>
          {items.length > 1 && (
            <IconButton size="small" onClick={() => setItems((p) => p.filter((_, i) => i !== idx))} sx={{ position: 'absolute', top: 2, right: 2 }}>
              <i className="ri-close-line" style={{ fontSize: 14 }} />
            </IconButton>
          )}
          <Grid container spacing={1}>
            <Grid size={{ xs: 12 }}>
              <TextField label="Medicamento" value={item.medication} onChange={(e) => updateItem(idx, 'medication', e.target.value)} fullWidth size="small" disabled={actionLoading} />
            </Grid>
            <Grid size={{ xs: 4 }}>
              <TextField label="Dosis" value={item.dosage} onChange={(e) => updateItem(idx, 'dosage', e.target.value)} fullWidth size="small" disabled={actionLoading} />
            </Grid>
            <Grid size={{ xs: 4 }}>
              <TextField label="Frecuencia" value={item.frequency} onChange={(e) => updateItem(idx, 'frequency', e.target.value)} fullWidth size="small" disabled={actionLoading} />
            </Grid>
            <Grid size={{ xs: 4 }}>
              <TextField label="Duración" value={item.duration} onChange={(e) => updateItem(idx, 'duration', e.target.value)} fullWidth size="small" disabled={actionLoading} />
            </Grid>
          </Grid>
        </Box>
      ))}

      <Button variant="outlined" size="small" onClick={() => setItems((p) => [...p, { medication: '', dosage: '', frequency: '', duration: '' }])} sx={{ mb: 2 }}
        startIcon={<i className="ri-add-line" style={{ fontSize: 14 }} />}>
        Agregar medicamento
      </Button>

      <Button type="submit" variant="contained" size="small" fullWidth disabled={actionLoading}
        startIcon={actionLoading ? <CircularProgress size={14} color="inherit" /> : undefined}>
        {actionLoading ? 'Guardando...' : 'Guardar Receta'}
      </Button>
    </Box>
  );
}
