'use client';

import { useEffect } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import { alpha, useTheme } from '@mui/material/styles';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import type { Doctor } from '@/views/doctors/types';
import type { ScheduleBlock } from '../types';
import { ScheduleBlockType } from '../types';
import { scheduleBlockSchema, type ScheduleBlockFormValues } from '../functions/schedule-block.schema';

const TYPE_OPTIONS = [
  { value: ScheduleBlockType.FULL_DAY, label: 'Día Completo' },
  { value: ScheduleBlockType.TIME_RANGE, label: 'Rango Horario' },
];

interface ScheduleBlockFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: ScheduleBlockFormValues) => void;
  entry?: ScheduleBlock | null;
  doctors: Doctor[];
  submitting: boolean;
}

export function ScheduleBlockForm({
  open,
  onClose,
  onSubmit,
  entry,
  doctors,
  submitting,
}: ScheduleBlockFormProps) {
  const theme = useTheme();
  const isEdit = !!entry;

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<ScheduleBlockFormValues>({
    resolver: zodResolver(scheduleBlockSchema),
    defaultValues: {
      doctorId: 0,
      type: ScheduleBlockType.FULL_DAY,
      startDate: '',
      endDate: '',
      timeFrom: '',
      timeTo: '',
      reason: '',
    },
  });

  const watchedType = watch('type');

  useEffect(() => {
    if (open) {
      if (entry) {
        reset({
          doctorId: entry.doctorId,
          type: entry.type,
          startDate: entry.startDate ? entry.startDate.split('T')[0] : '',
          endDate: entry.endDate ? entry.endDate.split('T')[0] : '',
          timeFrom: entry.timeFrom ?? '',
          timeTo: entry.timeTo ?? '',
          reason: entry.reason,
        });
      } else {
        reset({
          doctorId: 0,
          type: ScheduleBlockType.FULL_DAY,
          startDate: '',
          endDate: '',
          timeFrom: '',
          timeTo: '',
          reason: '',
        });
      }
    }
  }, [open, entry, reset]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      {/* Header */}
      <Box
        sx={{
          px: 3,
          pt: 2.5,
          pb: 2,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: `3px solid ${theme.palette.primary.main}`,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: 2,
              bgcolor: alpha(theme.palette.primary.main, 0.1),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <i
              className={isEdit ? 'ri-pencil-line' : 'ri-add-circle-line'}
              style={{ fontSize: 20, color: theme.palette.primary.main }}
            />
          </Box>
          <Typography variant="h6" component="span" fontWeight={700}>
            {isEdit ? 'Editar Bloqueo' : 'Nuevo Bloqueo'}
          </Typography>
        </Box>
        <IconButton size="small" onClick={onClose}>
          <i className="ri-close-line" style={{ fontSize: 20 }} />
        </IconButton>
      </Box>

      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent sx={{ pt: 3, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          <Controller
            name="doctorId"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                select
                label="Doctor"
                error={!!errors.doctorId}
                helperText={errors.doctorId?.message}
                fullWidth
                disabled={isEdit}
              >
                {doctors.map((d) => (
                  <MenuItem key={d.id} value={d.id}>
                    {d.profile.name} {d.profile.lastName}
                  </MenuItem>
                ))}
              </TextField>
            )}
          />

          <Controller
            name="type"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                select
                label="Tipo de Bloqueo"
                error={!!errors.type}
                helperText={errors.type?.message}
                fullWidth
              >
                {TYPE_OPTIONS.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </TextField>
            )}
          />

          <Box sx={{ display: 'flex', gap: 2 }}>
            <Controller
              name="startDate"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Fecha de Inicio"
                  type="date"
                  slotProps={{ inputLabel: { shrink: true } }}
                  error={!!errors.startDate}
                  helperText={errors.startDate?.message}
                  fullWidth
                />
              )}
            />

            <Controller
              name="endDate"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Fecha de Fin"
                  type="date"
                  slotProps={{ inputLabel: { shrink: true } }}
                  error={!!errors.endDate}
                  helperText={errors.endDate?.message}
                  fullWidth
                />
              )}
            />
          </Box>

          {watchedType === ScheduleBlockType.TIME_RANGE && (
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Controller
                name="timeFrom"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Hora de Inicio"
                    type="time"
                    slotProps={{ inputLabel: { shrink: true } }}
                    error={!!errors.timeFrom}
                    helperText={errors.timeFrom?.message}
                    fullWidth
                  />
                )}
              />

              <Controller
                name="timeTo"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Hora de Fin"
                    type="time"
                    slotProps={{ inputLabel: { shrink: true } }}
                    error={!!errors.timeTo}
                    helperText={errors.timeTo?.message}
                    fullWidth
                  />
                )}
              />
            </Box>
          )}

          <Controller
            name="reason"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Motivo"
                multiline
                rows={3}
                error={!!errors.reason}
                helperText={errors.reason?.message}
                fullWidth
                placeholder="Motivo del bloqueo de horario..."
              />
            )}
          />
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button onClick={onClose} disabled={submitting} variant="outlined" size="small">
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={submitting}
            startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : null}
            size="small"
          >
            {isEdit ? 'Actualizar' : 'Guardar'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
