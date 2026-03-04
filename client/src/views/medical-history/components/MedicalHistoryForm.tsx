'use client';

import { useEffect } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import type { Patient } from '@/views/patients/types';
import type { MedicalHistory } from '../types';
import { MedicalHistoryStatus } from '../types';
import { medicalHistorySchema, type MedicalHistoryFormValues } from '../functions/medical-history.schema';

interface MedicalHistoryFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: MedicalHistoryFormValues) => void;
  entry?: MedicalHistory | null;
  patients: Patient[];
  selectedPatientId?: number;
  submitting: boolean;
}

const STATUS_OPTIONS = [
  { value: MedicalHistoryStatus.ACTIVE, label: 'Activa' },
  { value: MedicalHistoryStatus.CHRONIC, label: 'Crónica' },
  { value: MedicalHistoryStatus.RESOLVED, label: 'Resuelta' },
];

export function MedicalHistoryForm({
  open,
  onClose,
  onSubmit,
  entry,
  patients,
  selectedPatientId,
  submitting,
}: MedicalHistoryFormProps) {
  const isEdit = !!entry;

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<MedicalHistoryFormValues>({
    resolver: zodResolver(medicalHistorySchema),
    defaultValues: {
      patientId: selectedPatientId ?? 0,
      condition: '',
      description: '',
      diagnosedDate: '',
      status: MedicalHistoryStatus.ACTIVE,
      notes: '',
    },
  });

  useEffect(() => {
    if (open) {
      if (entry) {
        reset({
          patientId: entry.patientId,
          condition: entry.condition,
          description: entry.description ?? '',
          diagnosedDate: entry.diagnosedDate ? entry.diagnosedDate.split('T')[0] : '',
          status: entry.status,
          notes: entry.notes ?? '',
        });
      } else {
        reset({
          patientId: selectedPatientId ?? 0,
          condition: '',
          description: '',
          diagnosedDate: '',
          status: MedicalHistoryStatus.ACTIVE,
          notes: '',
        });
      }
    }
  }, [open, entry, selectedPatientId, reset]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
        <Typography variant="h6" component="span" fontWeight={700}>
          {isEdit ? 'Editar Entrada' : 'Nueva Entrada'}
        </Typography>
        <IconButton size="small" onClick={onClose}>
          <i className="ri-close-line" style={{ fontSize: 20 }} />
        </IconButton>
      </DialogTitle>

      <Divider />

      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent sx={{ pt: 3, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          {!isEdit && (
            <Controller
              name="patientId"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  select
                  label="Paciente"
                  error={!!errors.patientId}
                  helperText={errors.patientId?.message}
                  fullWidth
                  disabled={!!selectedPatientId}
                >
                  {patients.map((p) => (
                    <MenuItem key={p.id} value={p.id}>
                      {p.profile.name} {p.profile.lastName}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
          )}

          <Controller
            name="condition"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Condición"
                error={!!errors.condition}
                helperText={errors.condition?.message}
                fullWidth
              />
            )}
          />

          <Controller
            name="description"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Descripción"
                multiline
                rows={3}
                error={!!errors.description}
                helperText={errors.description?.message}
                fullWidth
              />
            )}
          />

          <Controller
            name="diagnosedDate"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Fecha de Diagnóstico"
                type="date"
                slotProps={{ inputLabel: { shrink: true } }}
                error={!!errors.diagnosedDate}
                helperText={errors.diagnosedDate?.message}
                fullWidth
              />
            )}
          />

          <Controller
            name="status"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                select
                label="Estado"
                error={!!errors.status}
                helperText={errors.status?.message}
                fullWidth
              >
                {STATUS_OPTIONS.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </TextField>
            )}
          />

          <Controller
            name="notes"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Notas"
                multiline
                rows={3}
                error={!!errors.notes}
                helperText={errors.notes?.message}
                fullWidth
              />
            )}
          />
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={submitting}
            startIcon={submitting ? <CircularProgress size={18} /> : null}
          >
            {isEdit ? 'Actualizar' : 'Guardar'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
