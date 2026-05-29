'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Skeleton from '@mui/material/Skeleton';
import Alert from '@mui/material/Alert';
import { PageHeader } from '@/components/shared/PageHeader';
import { useSnackbar } from '@/hooks/useSnackbar';
import { SuccessSnackbar } from '@/components/shared/SuccessSnackbar';
import { extractApiError } from '@/utils/extractApiError';
import { formatDate } from '@/utils/formatDate';
import { specialtiesService } from '@/services/specialties.service';
import { doctorsService } from '@/services/doctors.service';
import { waitlistService } from '@/services/waitlist.service';
import { TIME_PREFERENCE_LABELS } from '../functions/waitlist.schema';
import type { WaitlistEntry } from '../types';
import { PriorityDialog } from './PriorityDialog';

export default function ClinicWaitlistView() {
  const queryClient = useQueryClient();
  const { snackbar, showSnackbar, closeSnackbar } = useSnackbar();

  const [specialtyId, setSpecialtyId] = useState<number | ''>('');
  const [doctorId, setDoctorId] = useState<number | ''>('');
  const [priorityTarget, setPriorityTarget] = useState<WaitlistEntry | null>(null);

  const { data: specialties = [] } = useQuery({
    queryKey: ['specialties', 'waitlist-staff'],
    queryFn: () =>
      specialtiesService.findAllPaginated({ pageSize: 100 }).then((r) => r.rows),
    staleTime: 5 * 60 * 1000,
  });

  const { data: doctors = [] } = useQuery({
    queryKey: ['doctors', 'waitlist-staff', specialtyId],
    queryFn: () =>
      doctorsService
        .findAllPaginated({ pageSize: 100 }, specialtyId === '' ? undefined : specialtyId)
        .then((r) => r.rows),
    staleTime: 5 * 60 * 1000,
  });

  const filters = {
    specialtyId: specialtyId === '' ? undefined : specialtyId,
    doctorId: doctorId === '' ? undefined : doctorId,
  };

  const {
    data: entries = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['waitlist', 'clinic', filters.specialtyId, filters.doctorId],
    queryFn: () => waitlistService.getClinicWaitlist(filters),
    staleTime: 30 * 1000,
  });

  const priorityMutation = useMutation({
    mutationFn: ({ entryId, delta }: { entryId: number; delta: number }) =>
      waitlistService.addPriority(entryId, delta),
    onSuccess: () => {
      setPriorityTarget(null);
      showSnackbar('Prioridad actualizada', 'success');
      void queryClient.invalidateQueries({ queryKey: ['waitlist', 'clinic'] });
    },
    onError: (err) => {
      showSnackbar(extractApiError(err, 'No se pudo actualizar la prioridad').message, 'error');
    },
  });

  return (
    <Box>
      <PageHeader
        title="Lista de espera"
        subtitle="Cola activa de la clínica, ordenada por prioridad y antigüedad"
      />

      <Card variant="outlined" sx={{ borderRadius: 2, p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <TextField
            select
            size="small"
            label="Especialidad"
            value={specialtyId}
            onChange={(e) => {
              setSpecialtyId(e.target.value === '' ? '' : Number(e.target.value));
              setDoctorId('');
            }}
            sx={{ minWidth: 220 }}
          >
            <MenuItem value="">Todas</MenuItem>
            {specialties.map((s) => (
              <MenuItem key={s.id} value={s.id}>
                {s.name}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            size="small"
            label="Doctor"
            value={doctorId}
            onChange={(e) => setDoctorId(e.target.value === '' ? '' : Number(e.target.value))}
            sx={{ minWidth: 220 }}
          >
            <MenuItem value="">Todos</MenuItem>
            {doctors.map((d) => (
              <MenuItem key={d.id} value={d.id}>
                Dr. {d.profile.name} {d.profile.lastName}
              </MenuItem>
            ))}
          </TextField>
        </Box>
      </Card>

      {isLoading ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} variant="rounded" height={56} />
          ))}
        </Box>
      ) : isError ? (
        <Alert severity="error">No se pudo cargar la lista de espera.</Alert>
      ) : entries.length === 0 ? (
        <Card variant="outlined" sx={{ borderRadius: 2, borderStyle: 'dashed' }}>
          <Box sx={{ textAlign: 'center', py: 5 }}>
            <i className="ri-inbox-line" style={{ fontSize: 40, color: 'var(--mui-palette-text-disabled)' }} />
            <Typography variant="body1" fontWeight={600} sx={{ mt: 1 }}>
              No hay pacientes en lista de espera
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Cuando alguien se una a la cola, aparecerá aquí.
            </Typography>
          </Box>
        </Card>
      ) : (
        <TableContainer component={Card} variant="outlined" sx={{ borderRadius: 2 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell width={56}>#</TableCell>
                <TableCell>Paciente</TableCell>
                <TableCell>Especialidad</TableCell>
                <TableCell>Doctor preferido</TableCell>
                <TableCell>Ventana</TableCell>
                <TableCell>Franja</TableCell>
                <TableCell align="center">Prioridad</TableCell>
                <TableCell align="right">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {entries.map((entry, idx) => (
                <TableRow key={entry.id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight={700} color="text.secondary">
                      {idx + 1}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>
                      {entry.patientName}
                    </Typography>
                  </TableCell>
                  <TableCell>{entry.specialtyName}</TableCell>
                  <TableCell>
                    <Typography variant="body2" color={entry.doctorName ? 'text.primary' : 'text.secondary'}>
                      {entry.doctorName ?? 'Cualquiera'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {formatDate(entry.dateFrom)} – {formatDate(entry.dateTo)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption">
                      {TIME_PREFERENCE_LABELS[entry.timePreference]}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Chip label={entry.priority} size="small" color="primary" variant="outlined" />
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Subir prioridad">
                      <IconButton size="small" color="primary" onClick={() => setPriorityTarget(entry)}>
                        <i className="ri-arrow-up-circle-line" style={{ fontSize: 20 }} />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <PriorityDialog
        entry={priorityTarget}
        onClose={() => setPriorityTarget(null)}
        onConfirm={(entryId, delta) => priorityMutation.mutate({ entryId, delta })}
        submitting={priorityMutation.isPending}
      />

      <SuccessSnackbar snackbar={snackbar} onClose={closeSnackbar} />
    </Box>
  );
}
