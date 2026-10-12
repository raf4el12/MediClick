'use client';

import { useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import Chip from '@mui/material/Chip';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { DataTable } from '@/components/shared/DataTable';
import type { PaginatedResponse } from '@/types/pagination.types';
import { formatDate } from '@/utils/formatDate';
import { ALL_STATUSES, STATUS_META } from '@/views/agenda/status';
import type { Appointment, AppointmentFilters, AppointmentStatus } from '@/views/appointments/types';

export interface ClinicalPagination {
  searchValue: string;
  currentPage: number;
  pageSize: number;
  orderBy: string;
  orderByMode: 'asc' | 'desc';
  totalPages: number;
}

interface ClinicalAppointmentsTableProps {
  data: PaginatedResponse<Appointment>;
  loading: boolean;
  error: string | null;
  pagination: ClinicalPagination;
  setPagination: React.Dispatch<React.SetStateAction<ClinicalPagination>>;
  filters: AppointmentFilters;
  updateFilters: (updates: Partial<AppointmentFilters>) => void;
  debouncedSearch: (value: string) => void;
  onRetry: () => void;
  /** Columna propia de cada pantalla (notas o receta) y la acción que abre el drawer. */
  extraColumn: ColumnDef<Appointment, unknown>;
  actionLabel: string;
  actionAriaLabel: (patientName: string) => string;
  onOpen: (appointment: Appointment) => void;
}

const patientName = (a: Appointment) => `${a.patient.name} ${a.patient.lastName}`;

/** Citas de la sede con filtros (patrón `user/list` de Materio), para elegir la cita que se abre en el drawer. */
export default function ClinicalAppointmentsTable({
  data,
  loading,
  error,
  pagination,
  setPagination,
  filters,
  updateFilters,
  debouncedSearch,
  onRetry,
  extraColumn,
  actionLabel,
  actionAriaLabel,
  onOpen,
}: ClinicalAppointmentsTableProps) {
  const columns = useMemo<ColumnDef<Appointment, unknown>[]>(
    () => [
      {
        id: 'patient',
        header: 'Paciente',
        cell: ({ row }) => (
          <Typography color='text.primary' className='font-medium'>
            {patientName(row.original)}
          </Typography>
        ),
      },
      {
        id: 'doctor',
        header: 'Médico',
        meta: { hiddenOnMobile: true },
        cell: ({ row }) => `${row.original.schedule.doctor.name} ${row.original.schedule.doctor.lastName}`,
      },
      {
        id: 'specialty',
        header: 'Especialidad',
        meta: { hiddenOnMobile: true },
        cell: ({ row }) => row.original.schedule.specialty.name,
      },
      {
        id: 'date',
        header: 'Fecha',
        cell: ({ row }) => formatDate(row.original.schedule.scheduleDate),
      },
      {
        id: 'status',
        header: 'Estado',
        cell: ({ row }) => {
          const meta = STATUS_META[row.original.status];
          return <Chip size='small' variant='tonal' color={meta.color} label={meta.label} />;
        },
      },
      extraColumn,
      {
        id: 'actions',
        // En un elemento: la regla `[align='right'] > *` de Materio alinea hijos, no texto suelto.
        header: () => <div>Acciones</div>,
        meta: { align: 'right' },
        cell: ({ row }) => (
          <Button size='small' variant='outlined' aria-label={actionAriaLabel(patientName(row.original))} onClick={() => onOpen(row.original)}>
            {actionLabel}
          </Button>
        ),
      },
    ],
    [extraColumn, actionLabel, actionAriaLabel, onOpen],
  );

  return (
    <Card>
      <CardHeader title='Citas' subheader={`${data.totalRows} en total`} />
      <div className='grid gap-4 pli-5 pbe-5 sm:grid-cols-2 lg:grid-cols-4'>
        <TextField
          id='clinicas-desde'
          size='small'
          type='date'
          label='Desde'
          value={filters.dateFrom ?? ''}
          onChange={(e) => updateFilters({ dateFrom: e.target.value || undefined })}
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <TextField
          id='clinicas-hasta'
          size='small'
          type='date'
          label='Hasta'
          value={filters.dateTo ?? ''}
          onChange={(e) => updateFilters({ dateTo: e.target.value || undefined })}
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <TextField
          id='clinicas-estado'
          select
          size='small'
          label='Estado'
          value={filters.status ?? ''}
          onChange={(e) => updateFilters({ status: (e.target.value as AppointmentStatus) || undefined })}
        >
          <MenuItem value=''>Todos</MenuItem>
          {ALL_STATUSES.map((s) => (
            <MenuItem key={s} value={s}>
              {STATUS_META[s].label}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          id='clinicas-buscar'
          size='small'
          type='search'
          label='Buscar'
          placeholder='Paciente o médico'
          onChange={(e) => debouncedSearch(e.target.value)}
        />
      </div>
      {error && (
        <Alert
          severity='error'
          className='mli-5 mbe-4'
          action={
            <Button color='inherit' size='small' onClick={onRetry}>
              Reintentar
            </Button>
          }
        >
          {error}
        </Alert>
      )}
      <DataTable
        label='Citas'
        columns={columns}
        rows={data.rows}
        totalRows={data.totalRows}
        isLoading={loading}
        pagination={{ pageIndex: pagination.currentPage - 1, pageSize: pagination.pageSize }}
        pageSizeOptions={[8, 15, 25]}
        onPaginationChange={({ pageIndex, pageSize }) => setPagination((prev) => ({ ...prev, currentPage: pageIndex + 1, pageSize }))}
        emptyMessage='No hay citas con estos filtros.'
      />
    </Card>
  );
}
