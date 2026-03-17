'use client';

import { useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
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

interface AppointmentWorkspaceDialogProps {
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

export function AppointmentWorkspaceDialog({
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
}: AppointmentWorkspaceDialogProps) {
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState(0);

  if (!appointment) return null;

  const isInProgress = appointment.status === AppointmentStatus.IN_PROGRESS;
  const isCompleted = appointment.status === AppointmentStatus.COMPLETED;
  const canWrite = isInProgress || isCompleted;

  return (
    <Dialog
      open={!!appointment}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3, maxHeight: '90vh' } }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 3,
                bgcolor: alpha(theme.palette.primary.main, 0.1),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <i className="ri-user-heart-line" style={{ fontSize: 24, color: theme.palette.primary.main }} />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight={700}>
                {appointment.patient.name} {appointment.patient.lastName}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {appointment.schedule.specialty.name} — {appointment.startTime} a {appointment.endTime}
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip
              label={appointment.status === AppointmentStatus.IN_PROGRESS ? 'En Consulta' : appointment.status === AppointmentStatus.COMPLETED ? 'Completada' : appointment.status}
              color={appointment.status === AppointmentStatus.IN_PROGRESS ? 'info' : appointment.status === AppointmentStatus.COMPLETED ? 'success' : 'default'}
              size="small"
            />
            <IconButton onClick={onClose} size="small">
              <i className="ri-close-line" style={{ fontSize: 20 }} />
            </IconButton>
          </Box>
        </Box>
      </DialogTitle>

      <Divider />

      {/* Patient info bar */}
      <Box sx={{ px: 3, py: 1.5, bgcolor: alpha(theme.palette.primary.main, 0.03) }}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 4 }}>
            <Typography variant="caption" color="text.secondary">Paciente</Typography>
            <Typography variant="body2" fontWeight={600}>
              {appointment.patient.name} {appointment.patient.lastName}
            </Typography>
          </Grid>
          <Grid size={{ xs: 6, sm: 4 }}>
            <Typography variant="caption" color="text.secondary">Email</Typography>
            <Typography variant="body2">{appointment.patient.email}</Typography>
          </Grid>
          <Grid size={{ xs: 6, sm: 4 }}>
            <Typography variant="caption" color="text.secondary">Motivo</Typography>
            <Typography variant="body2">{appointment.reason || 'No especificado'}</Typography>
          </Grid>
        </Grid>
      </Box>

      <Divider />

      {actionError && (
        <Alert severity="error" sx={{ mx: 3, mt: 2 }}>{actionError}</Alert>
      )}

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onChange={(_, v) => setActiveTab(v)}
        sx={{ px: 3, borderBottom: '1px solid', borderColor: 'divider' }}
      >
        <Tab
          label={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <i className="ri-file-text-line" style={{ fontSize: 16 }} />
              Notas Clínicas
              {notes.length > 0 && (
                <Chip label={notes.length} size="small" color="primary" sx={{ height: 20, minWidth: 20 }} />
              )}
            </Box>
          }
        />
        <Tab
          label={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <i className="ri-medicine-bottle-line" style={{ fontSize: 16 }} />
              Receta
              {prescription && (
                <Chip label="1" size="small" color="success" sx={{ height: 20, minWidth: 20 }} />
              )}
            </Box>
          }
        />
      </Tabs>

      <DialogContent sx={{ p: 3, minHeight: 300 }}>
        {activeTab === 0 && (
          <ClinicalNotesTab
            appointmentId={appointment.id}
            notes={notes}
            loading={loadingNotes}
            actionLoading={actionLoading}
            canWrite={canWrite}
            onCreateNote={onCreateNote}
          />
        )}
        {activeTab === 1 && (
          <PrescriptionTab
            appointmentId={appointment.id}
            prescription={prescription}
            loading={loadingPrescription}
            actionLoading={actionLoading}
            canWrite={canWrite}
            onCreatePrescription={onCreatePrescription}
          />
        )}
      </DialogContent>

      {isInProgress && (
        <>
          <Divider />
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button variant="outlined" onClick={onClose}>
              Cerrar
            </Button>
            <Button
              variant="contained"
              color="success"
              onClick={() => void onComplete(appointment.id)}
              disabled={actionLoading}
              startIcon={actionLoading ? <CircularProgress size={16} color="inherit" /> : <i className="ri-check-double-line" style={{ fontSize: 18 }} />}
            >
              Completar Consulta
            </Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
}

// ── Clinical Notes Tab ──

function ClinicalNotesTab({
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
  onCreateNote: (payload: CreateClinicalNotePayload) => Promise<void>;
}) {
  const [diagnosis, setDiagnosis] = useState('');
  const [summary, setSummary] = useState('');
  const [plan, setPlan] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!diagnosis.trim() && !summary.trim() && !plan.trim()) {
      setFormError('Debes completar al menos un campo.');
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
    return (
      <>
        <Skeleton variant="rectangular" height={80} sx={{ mb: 2, borderRadius: 1 }} />
        <Skeleton variant="rectangular" height={80} sx={{ borderRadius: 1 }} />
      </>
    );
  }

  return (
    <>
      {/* Existing notes */}
      {notes.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1.5 }}>
            Notas registradas ({notes.length})
          </Typography>
          {notes.map((note, idx) => (
            <Box
              key={note.id}
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 2,
                p: 2,
                mb: 1.5,
              }}
            >
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                Nota #{idx + 1} — {new Date(note.createdAt).toLocaleString('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </Typography>
              {note.diagnosis && (
                <Box sx={{ mb: 0.5 }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>Diagnostico:</Typography>
                  <Typography variant="body2">{note.diagnosis}</Typography>
                </Box>
              )}
              {note.summary && (
                <Box sx={{ mb: 0.5 }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>Resumen:</Typography>
                  <Typography variant="body2">{note.summary}</Typography>
                </Box>
              )}
              {note.plan && (
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>Plan:</Typography>
                  <Typography variant="body2">{note.plan}</Typography>
                </Box>
              )}
            </Box>
          ))}
        </Box>
      )}

      {/* New note form */}
      {canWrite && (
        <>
          <Divider sx={{ mb: 2 }} />
          <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1.5 }}>
            Agregar nota clínica
          </Typography>
          {formError && <Alert severity="warning" sx={{ mb: 2 }}>{formError}</Alert>}
          <Box component="form" onSubmit={(e) => { void handleSubmit(e); }}>
            <TextField
              label="Diagnostico"
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              fullWidth size="small" sx={{ mb: 2 }}
              disabled={actionLoading}
            />
            <TextField
              label="Resumen / Anamnesis"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              fullWidth multiline minRows={2} size="small" sx={{ mb: 2 }}
              disabled={actionLoading}
            />
            <TextField
              label="Plan de tratamiento"
              value={plan}
              onChange={(e) => setPlan(e.target.value)}
              fullWidth multiline minRows={2} size="small" sx={{ mb: 2 }}
              disabled={actionLoading}
            />
            <Button
              type="submit"
              variant="contained"
              disabled={actionLoading}
              startIcon={actionLoading ? <CircularProgress size={16} color="inherit" /> : undefined}
            >
              {actionLoading ? 'Guardando...' : 'Guardar Nota'}
            </Button>
          </Box>
        </>
      )}

      {!canWrite && notes.length === 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
          No hay notas clínicas para esta cita.
        </Typography>
      )}
    </>
  );
}

// ── Prescription Tab ──

function PrescriptionTab({
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
  onCreatePrescription: (payload: CreatePrescriptionPayload) => Promise<void>;
}) {
  const theme = useTheme();
  const [instructions, setInstructions] = useState('');
  const [items, setItems] = useState<PrescriptionItemPayload[]>([
    { medication: '', dosage: '', frequency: '', duration: '' },
  ]);
  const [formError, setFormError] = useState<string | null>(null);

  const updateItem = (index: number, field: keyof PrescriptionItemPayload, value: string) => {
    setItems((prev) => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
  };

  const addItem = () => {
    setItems((prev) => [...prev, { medication: '', dosage: '', frequency: '', duration: '' }]);
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const validItems = items.filter((it) => it.medication.trim());
    if (validItems.length === 0) {
      setFormError('Debes agregar al menos un medicamento.');
      return;
    }

    await onCreatePrescription({
      appointmentId,
      instructions: instructions.trim() || undefined,
      items: validItems.map((it) => ({
        medication: it.medication.trim(),
        dosage: it.dosage.trim(),
        frequency: it.frequency.trim(),
        duration: it.duration.trim(),
        ...(it.notes?.trim() ? { notes: it.notes.trim() } : {}),
      })),
    });

    setInstructions('');
    setItems([{ medication: '', dosage: '', frequency: '', duration: '' }]);
  };

  if (loading) {
    return <Skeleton variant="rectangular" height={120} sx={{ borderRadius: 1 }} />;
  }

  // Show existing prescription
  if (prescription) {
    return (
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <i className="ri-check-line" style={{ fontSize: 18, color: theme.palette.success.main }} />
          <Typography variant="subtitle2" fontWeight={600}>
            Receta registrada
          </Typography>
          <Typography variant="caption" color="text.secondary">
            ({new Date(prescription.createdAt).toLocaleString('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })})
          </Typography>
        </Box>

        {prescription.instructions && (
          <Box sx={{ mb: 2, p: 2, bgcolor: alpha(theme.palette.info.main, 0.05), borderRadius: 2 }}>
            <Typography variant="caption" color="text.secondary">Instrucciones generales</Typography>
            <Typography variant="body2">{prescription.instructions}</Typography>
          </Box>
        )}

        {prescription.items.map((item, idx) => (
          <Box
            key={item.id}
            sx={{
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 2,
              p: 2,
              mb: 1.5,
            }}
          >
            <Typography variant="subtitle2" fontWeight={600}>
              {idx + 1}. {item.medication}
            </Typography>
            <Grid container spacing={1} sx={{ mt: 0.5 }}>
              <Grid size={{ xs: 4 }}>
                <Typography variant="caption" color="text.secondary">Dosis</Typography>
                <Typography variant="body2">{item.dosage}</Typography>
              </Grid>
              <Grid size={{ xs: 4 }}>
                <Typography variant="caption" color="text.secondary">Frecuencia</Typography>
                <Typography variant="body2">{item.frequency}</Typography>
              </Grid>
              <Grid size={{ xs: 4 }}>
                <Typography variant="caption" color="text.secondary">Duración</Typography>
                <Typography variant="body2">{item.duration}</Typography>
              </Grid>
            </Grid>
            {item.notes && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Nota: {item.notes}
              </Typography>
            )}
          </Box>
        ))}
      </Box>
    );
  }

  // New prescription form
  if (!canWrite) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
        No hay receta para esta cita.
      </Typography>
    );
  }

  return (
    <Box component="form" onSubmit={(e) => { void handleSubmit(e); }}>
      <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1.5 }}>
        Crear receta
      </Typography>

      {formError && <Alert severity="warning" sx={{ mb: 2 }}>{formError}</Alert>}

      <TextField
        label="Instrucciones generales"
        value={instructions}
        onChange={(e) => setInstructions(e.target.value)}
        fullWidth multiline minRows={2} size="small" sx={{ mb: 3 }}
        disabled={actionLoading}
      />

      <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
        Medicamentos
      </Typography>

      {items.map((item, idx) => (
        <Box
          key={idx}
          sx={{
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 2,
            p: 2,
            mb: 1.5,
            position: 'relative',
          }}
        >
          {items.length > 1 && (
            <IconButton
              size="small"
              onClick={() => removeItem(idx)}
              sx={{ position: 'absolute', top: 4, right: 4 }}
            >
              <i className="ri-close-line" style={{ fontSize: 16 }} />
            </IconButton>
          )}
          <Grid container spacing={1.5}>
            <Grid size={{ xs: 12 }}>
              <TextField
                label="Medicamento"
                value={item.medication}
                onChange={(e) => updateItem(idx, 'medication', e.target.value)}
                fullWidth size="small"
                disabled={actionLoading}
              />
            </Grid>
            <Grid size={{ xs: 4 }}>
              <TextField
                label="Dosis"
                value={item.dosage}
                onChange={(e) => updateItem(idx, 'dosage', e.target.value)}
                fullWidth size="small"
                disabled={actionLoading}
                placeholder="500mg"
              />
            </Grid>
            <Grid size={{ xs: 4 }}>
              <TextField
                label="Frecuencia"
                value={item.frequency}
                onChange={(e) => updateItem(idx, 'frequency', e.target.value)}
                fullWidth size="small"
                disabled={actionLoading}
                placeholder="Cada 8h"
              />
            </Grid>
            <Grid size={{ xs: 4 }}>
              <TextField
                label="Duración"
                value={item.duration}
                onChange={(e) => updateItem(idx, 'duration', e.target.value)}
                fullWidth size="small"
                disabled={actionLoading}
                placeholder="7 días"
              />
            </Grid>
          </Grid>
        </Box>
      ))}

      <Button
        variant="outlined"
        size="small"
        onClick={addItem}
        startIcon={<i className="ri-add-line" style={{ fontSize: 16 }} />}
        sx={{ mb: 3 }}
      >
        Agregar medicamento
      </Button>

      <Box>
        <Button
          type="submit"
          variant="contained"
          disabled={actionLoading}
          startIcon={actionLoading ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          {actionLoading ? 'Guardando...' : 'Guardar Receta'}
        </Button>
      </Box>
    </Box>
  );
}
