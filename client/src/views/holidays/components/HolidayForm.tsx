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
import Alert from '@mui/material/Alert';
import { alpha, useTheme } from '@mui/material/styles';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import type { Holiday } from '../types';
import { holidaySchema, type HolidayFormValues } from '../functions/holiday.schema';

interface HolidayFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: HolidayFormValues) => void;
  entry: Holiday | null;
  submitting: boolean;
  apiError?: string | null;
}

const RECURRING_OPTIONS = [
  { value: 'true', label: 'Sí, se repite cada año' },
  { value: 'false', label: 'No, solo este año' },
];

export function HolidayForm({
  open,
  onClose,
  onSubmit,
  entry,
  submitting,
  apiError,
}: HolidayFormProps) {
  const theme = useTheme();
  const isEdit = !!entry;

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<HolidayFormValues>({
    resolver: zodResolver(holidaySchema),
    defaultValues: {
      name: '',
      date: '',
      isRecurring: false,
    },
  });

  useEffect(() => {
    if (open) {
      if (entry) {
        reset({
          name: entry.name,
          date: entry.date ? entry.date.split('T')[0] : '',
          isRecurring: entry.isRecurring,
        });
      } else {
        reset({
          name: '',
          date: '',
          isRecurring: false,
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
              className={isEdit ? 'ri-pencil-line' : 'ri-calendar-event-line'}
              style={{ fontSize: 20, color: theme.palette.primary.main }}
            />
          </Box>
          <Typography variant="h6" component="span" fontWeight={700}>
            {isEdit ? 'Editar Feriado' : 'Nuevo Feriado'}
          </Typography>
        </Box>
        <IconButton size="small" onClick={onClose}>
          <i className="ri-close-line" style={{ fontSize: 20 }} />
        </IconButton>
      </Box>

      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent sx={{ pt: 3, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          {apiError && (
            <Alert severity="error" variant="outlined" sx={{ mb: 0.5 }}>
              {apiError}
            </Alert>
          )}

          <Controller
            name="name"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Nombre"
                error={!!errors.name}
                helperText={errors.name?.message}
                fullWidth
                placeholder="Ej: Día del Trabajo"
              />
            )}
          />

          <Controller
            name="date"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Fecha"
                type="date"
                slotProps={{ inputLabel: { shrink: true } }}
                error={!!errors.date}
                helperText={errors.date?.message}
                fullWidth
              />
            )}
          />

          <Controller
            name="isRecurring"
            control={control}
            render={({ field }) => (
              <TextField
                select
                label="Recurrente"
                value={String(field.value)}
                onChange={(e) => field.onChange(e.target.value === 'true')}
                error={!!errors.isRecurring}
                helperText={errors.isRecurring?.message}
                fullWidth
              >
                {RECURRING_OPTIONS.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </TextField>
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
