'use client';

import { useEffect } from 'react';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { Patient } from '@/views/patients/types';
import { medicalHistorySchema, type MedicalHistoryFormValues } from '../functions/medical-history.schema';
import { HISTORY_STATUS, HISTORY_STATUSES } from '../status';
import type { MedicalHistory } from '../types';
import { MedicalHistoryStatus } from '../types';

interface MedicalHistoryFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: MedicalHistoryFormValues) => void;
  entry?: MedicalHistory | null;
  patients: Patient[];
  selectedPatientId?: number;
  submitting: boolean;
}

/** Alta y edición de un antecedente en un drawer lateral (patrón `AddUserDrawer` de Materio). */
export function MedicalHistoryForm({ open, onClose, onSubmit, entry, patients, selectedPatientId, submitting }: MedicalHistoryFormProps) {
  const isEdit = !!entry;
  const title = isEdit ? 'Editar entrada' : 'Nueva entrada';

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
    if (!open) return;
    reset(
      entry
        ? {
            patientId: entry.patientId,
            condition: entry.condition,
            description: entry.description ?? '',
            diagnosedDate: entry.diagnosedDate ? entry.diagnosedDate.split('T')[0] : '',
            status: entry.status,
            notes: entry.notes ?? '',
          }
        : {
            patientId: selectedPatientId ?? 0,
            condition: '',
            description: '',
            diagnosedDate: '',
            status: MedicalHistoryStatus.ACTIVE,
            notes: '',
          },
    );
  }, [open, entry, selectedPatientId, reset]);

  return (
    <Drawer
      open={open}
      anchor='right'
      onClose={onClose}
      slotProps={{ paper: { role: 'dialog', 'aria-modal': true, 'aria-label': title, className: 'is-full sm:is-[440px]' } }}
    >
      <div className='flex items-center justify-between pli-5 plb-4'>
        <Typography variant='h5' component='h2'>
          {title}
        </Typography>
        <IconButton size='small' aria-label='Cerrar' onClick={onClose}>
          <i className='ri-close-line text-2xl' aria-hidden />
        </IconButton>
      </div>
      <Divider />
      <form className='flex flex-col gap-5 p-5' onSubmit={handleSubmit(onSubmit)}>
        {!isEdit && (
          <Controller
            name='patientId'
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                id='historial-paciente'
                select
                label='Paciente'
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
          name='condition'
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              id='historial-condicion'
              label='Condición'
              error={!!errors.condition}
              helperText={errors.condition?.message}
              fullWidth
              placeholder='Diabetes tipo 2, hipertensión…'
            />
          )}
        />
        <Controller
          name='description'
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              id='historial-descripcion'
              label='Descripción'
              multiline
              rows={3}
              error={!!errors.description}
              helperText={errors.description?.message}
              fullWidth
            />
          )}
        />
        <div className='grid gap-4 sm:grid-cols-2'>
          <Controller
            name='diagnosedDate'
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                id='historial-diagnostico'
                label='Fecha de diagnóstico'
                type='date'
                slotProps={{ inputLabel: { shrink: true } }}
                error={!!errors.diagnosedDate}
                helperText={errors.diagnosedDate?.message}
                fullWidth
              />
            )}
          />
          <Controller
            name='status'
            control={control}
            render={({ field }) => (
              <TextField {...field} id='historial-estado' select label='Estado' error={!!errors.status} helperText={errors.status?.message} fullWidth>
                {HISTORY_STATUSES.map((s) => (
                  <MenuItem key={s} value={s}>
                    {HISTORY_STATUS[s].label}
                  </MenuItem>
                ))}
              </TextField>
            )}
          />
        </div>
        <Controller
          name='notes'
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              id='historial-notas'
              label='Notas'
              multiline
              rows={3}
              error={!!errors.notes}
              helperText={errors.notes?.message}
              fullWidth
              placeholder='Medicación, observaciones…'
            />
          )}
        />
        <div className='flex gap-3'>
          <Button type='submit' variant='contained' disabled={submitting} startIcon={submitting ? <CircularProgress size={16} color='inherit' /> : null}>
            {isEdit ? 'Guardar cambios' : 'Guardar'}
          </Button>
          <Button variant='outlined' onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
        </div>
      </form>
    </Drawer>
  );
}
