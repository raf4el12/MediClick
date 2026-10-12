'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import Alert from '@mui/material/Alert';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { DataTable } from '@/components/shared/DataTable';
import { doctorsService } from '@/services/doctors.service';
import { specialtiesService } from '@/services/specialties.service';
import { waitlistService } from '@/services/waitlist.service';
import { extractApiError } from '@/utils/extractApiError';
import { notify } from '@/utils/notify';
import type { WaitlistEntry } from '../types';
import { PriorityDialog } from './PriorityDialog';
import { toWaitlistRows, type WaitlistRow } from './functions/waitlistRows';

/** Cola de la sede (patrón `user/list` de Materio): filtros arriba y la lista completa, en el orden del servidor. */
export default function ClinicWaitlistView() {
  const queryClient = useQueryClient();
  const [specialtyId, setSpecialtyId] = useState<number | ''>('');
  const [doctorId, setDoctorId] = useState<number | ''>('');
  const [priorityTarget, setPriorityTarget] = useState<WaitlistEntry | null>(null);

  const { data: specialties = [] } = useQuery({
    queryKey: ['specialties', 'waitlist-staff'],
    queryFn: () => specialtiesService.findAllPaginated({ pageSize: 100 }).then((r) => r.rows),
    staleTime: 5 * 60 * 1000,
  });

  const { data: doctors = [] } = useQuery({
    queryKey: ['doctors', 'waitlist-staff', specialtyId],
    queryFn: () => doctorsService.findAllPaginated({ pageSize: 100 }, specialtyId === '' ? undefined : specialtyId).then((r) => r.rows),
    staleTime: 5 * 60 * 1000,
  });

  const filters = { specialtyId: specialtyId === '' ? undefined : specialtyId, doctorId: doctorId === '' ? undefined : doctorId };

  // `GET /waitlist` no pagina: se muestra la cola completa.
  const { data: entries = [], isLoading, isError } = useQuery({
    queryKey: ['waitlist', 'clinic', filters.specialtyId, filters.doctorId],
    queryFn: () => waitlistService.getClinicWaitlist(filters),
    staleTime: 30 * 1000,
  });

  const priorityMutation = useMutation({
    mutationFn: ({ entryId, delta }: { entryId: number; delta: number }) => waitlistService.addPriority(entryId, delta),
    onSuccess: () => {
      setPriorityTarget(null);
      notify('Prioridad actualizada');
      void queryClient.invalidateQueries({ queryKey: ['waitlist', 'clinic'] });
    },
    onError: (err) => notify(extractApiError(err, 'No se pudo actualizar la prioridad').message, 'error'),
  });

  const rows = useMemo(() => toWaitlistRows(entries), [entries]);

  const columns = useMemo<ColumnDef<WaitlistRow, unknown>[]>(
    () => [
      { id: 'position', header: '#', cell: ({ row }) => <Typography className='font-medium tabular-nums'>{row.original.position}</Typography> },
      {
        id: 'patient',
        header: 'Paciente',
        cell: ({ row }) => (
          <Typography className='font-medium' color='text.primary'>
            {row.original.entry.patientName}
          </Typography>
        ),
      },
      { id: 'specialty', header: 'Especialidad', cell: ({ row }) => row.original.entry.specialtyName },
      { id: 'doctor', header: 'Médico preferido', meta: { hiddenOnMobile: true }, cell: ({ row }) => row.original.doctor },
      { id: 'window', header: 'Ventana', meta: { hiddenOnMobile: true }, cell: ({ row }) => row.original.window },
      { id: 'timeSlot', header: 'Franja', meta: { hiddenOnMobile: true }, cell: ({ row }) => row.original.timeSlot },
      {
        id: 'priority',
        header: 'Prioridad',
        meta: { align: 'center' },
        cell: ({ row }) => <Chip size='small' variant='tonal' color='primary' label={row.original.entry.priority} />,
      },
      {
        id: 'actions',
        header: 'Acciones',
        meta: { align: 'center' },
        cell: ({ row }) => (
          <Tooltip title='Subir prioridad'>
            <IconButton aria-label={`Subir la prioridad de ${row.original.entry.patientName}`} onClick={() => setPriorityTarget(row.original.entry)}>
              <i className='ri-arrow-up-circle-line' aria-hidden />
            </IconButton>
          </Tooltip>
        ),
      },
    ],
    [],
  );

  return (
    <div className='flex flex-col gap-6'>
      <div>
        <Typography variant='h4' component='h1' className='mbe-1'>
          Lista de espera
        </Typography>
        <Typography>Cola activa de la sede, ordenada por prioridad de espera y llegada.</Typography>
      </div>
      <Card>
        <CardHeader title='Filtros' />
        <CardContent className='grid gap-5 sm:grid-cols-2 lg:grid-cols-3'>
          <TextField
            select
            id='espera-especialidad'
            label='Especialidad'
            value={specialtyId}
            onChange={(e) => {
              setSpecialtyId(e.target.value === '' ? '' : Number(e.target.value));
              setDoctorId('');
            }}
          >
            <MenuItem value=''>Todas</MenuItem>
            {specialties.map((s) => (
              <MenuItem key={s.id} value={s.id}>
                {s.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField select id='espera-medico' label='Médico' value={doctorId} onChange={(e) => setDoctorId(e.target.value === '' ? '' : Number(e.target.value))}>
            <MenuItem value=''>Todos</MenuItem>
            {doctors.map((d) => (
              <MenuItem key={d.id} value={d.id}>
                {d.profile.name} {d.profile.lastName}
              </MenuItem>
            ))}
          </TextField>
        </CardContent>
        <Divider />
        {isError ? (
          <CardContent>
            <Alert severity='error'>No se pudo cargar la lista de espera. Vuelve a intentarlo en unos minutos.</Alert>
          </CardContent>
        ) : (
          <DataTable
            label='Entradas en lista de espera'
            columns={columns}
            rows={rows}
            isLoading={isLoading}
            emptyMessage='No hay pacientes en lista de espera. Cuando alguien se una a la cola, aparecerá aquí.'
          />
        )}
      </Card>

      <PriorityDialog
        entry={priorityTarget}
        onClose={() => setPriorityTarget(null)}
        onConfirm={(entryId, delta) => priorityMutation.mutate({ entryId, delta })}
        submitting={priorityMutation.isPending}
      />
    </div>
  );
}
