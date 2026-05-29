'use client';

import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import { specialtiesService } from '@/services/specialties.service';
import { doctorsService } from '@/services/doctors.service';
import { getTodayInTimezone } from '@/utils/timezone';
import {
  joinWaitlistSchema,
  TIME_PREFERENCE_LABELS,
  type JoinWaitlistFormValues,
} from '../functions/waitlist.schema';
import { WaitlistTimePreference } from '../types';

interface JoinWaitlistDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: JoinWaitlistFormValues) => Promise<void>;
  submitting: boolean;
  error: string | null;
}

const today = () => getTodayInTimezone('America/Lima');

export function JoinWaitlistDialog({
  open,
  onClose,
  onSubmit,
  submitting,
  error,
}: JoinWaitlistDialogProps) {
  const {
    control,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors },
  } = useForm<JoinWaitlistFormValues>({
    resolver: zodResolver(joinWaitlistSchema),
    defaultValues: {
      dateFrom: today(),
      dateTo: today(),
      timePreference: WaitlistTimePreference.ANY,
      notes: '',
    },
  });

  const selectedSpecialtyId = watch('specialtyId');

  useEffect(() => {
    if (open) {
      reset({
        dateFrom: today(),
        dateTo: today(),
        timePreference: WaitlistTimePreference.ANY,
        notes: '',
      });
    }
  }, [open, reset]);

  const { data: specialties = [], isLoading: loadingSpecialties } = useQuery({
    queryKey: ['specialties', 'waitlist-join'],
    queryFn: () =>
      specialtiesService
        .findAllPaginated({ pageSize: 100 })
        .then((r) => r.rows.filter((s) => s.isActive)),
    enabled: open,
    staleTime: 5 * 60 * 1000,
  });

  const { data: doctors = [], isLoading: loadingDoctors } = useQuery({
    queryKey: ['doctors', 'waitlist-join', selectedSpecialtyId],
    queryFn: () =>
      doctorsService
        .findAllPaginated({ pageSize: 100 }, selectedSpecialtyId)
        .then((r) => r.rows.filter((d) => d.isActive)),
    enabled: open && selectedSpecialtyId != null,
    staleTime: 5 * 60 * 1000,
  });

  // Limpiar el doctor preferido si cambia la especialidad
  useEffect(() => {
    setValue('doctorId', undefined);
  }, [selectedSpecialtyId, setValue]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        Unirse a la lista de espera
        <IconButton onClick={onClose} size="small">
          <i className="ri-close-line" />
        </IconButton>
      </DialogTitle>

      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          <Alert severity="info" icon={<i className="ri-information-line" />} sx={{ borderRadius: 2 }}>
            Te avisaremos en cuanto se libere un cupo que coincida con tu búsqueda.
            Tendrás <b>15 minutos</b> para aceptarlo antes de que pase al siguiente paciente.
          </Alert>

          {error && (
            <Alert severity="error" sx={{ borderRadius: 2 }}>
              {error}
            </Alert>
          )}

          <Controller
            name="specialtyId"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                select
                label="Especialidad"
                value={field.value ?? ''}
                onChange={(e) => field.onChange(Number(e.target.value))}
                error={!!errors.specialtyId}
                helperText={errors.specialtyId?.message}
                disabled={loadingSpecialties}
                fullWidth
              >
                {specialties.map((s) => (
                  <MenuItem key={s.id} value={s.id}>
                    {s.name}
                  </MenuItem>
                ))}
              </TextField>
            )}
          />

          <Controller
            name="doctorId"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                select
                label="Doctor preferido (opcional)"
                value={field.value ?? ''}
                onChange={(e) =>
                  field.onChange(e.target.value === '' ? undefined : Number(e.target.value))
                }
                disabled={selectedSpecialtyId == null || loadingDoctors}
                helperText="Déjalo vacío para aceptar cualquier doctor"
                fullWidth
              >
                <MenuItem value="">Cualquier doctor</MenuItem>
                {doctors.map((d) => (
                  <MenuItem key={d.id} value={d.id}>
                    Dr. {d.profile.name} {d.profile.lastName}
                  </MenuItem>
                ))}
              </TextField>
            )}
          />

          <Box sx={{ display: 'flex', gap: 2 }}>
            <Controller
              name="dateFrom"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  type="date"
                  label="Desde"
                  InputLabelProps={{ shrink: true }}
                  inputProps={{ min: today() }}
                  error={!!errors.dateFrom}
                  helperText={errors.dateFrom?.message}
                  fullWidth
                />
              )}
            />
            <Controller
              name="dateTo"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  type="date"
                  label="Hasta"
                  InputLabelProps={{ shrink: true }}
                  inputProps={{ min: today() }}
                  error={!!errors.dateTo}
                  helperText={errors.dateTo?.message}
                  fullWidth
                />
              )}
            />
          </Box>

          <Controller
            name="timePreference"
            control={control}
            render={({ field }) => (
              <TextField {...field} select label="Franja horaria preferida" fullWidth>
                {Object.values(WaitlistTimePreference).map((pref) => (
                  <MenuItem key={pref} value={pref}>
                    {TIME_PREFERENCE_LABELS[pref]}
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
                label="Notas (opcional)"
                multiline
                rows={2}
                error={!!errors.notes}
                helperText={errors.notes?.message}
                fullWidth
              />
            )}
          />
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={submitting}
            startIcon={submitting ? <CircularProgress size={18} /> : <i className="ri-time-line" />}
          >
            {submitting ? 'Uniéndote…' : 'Unirme a la lista'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
