'use client';

import { useMemo } from 'react';
import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import TablePagination from '@mui/material/TablePagination';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { SkeletonTable } from '@/components/shared/SkeletonTable';
import { DebouncedInput } from '@/components/shared/DebouncedInput';
import { useTheme } from '@mui/material/styles';
import type { PaginatedResponse } from '@/types/pagination.types';
import { type Appointment, AppointmentStatus } from '@/views/appointments/types';
import type { AppointmentFilters } from '@/views/appointments/types';

const columnHelper = createColumnHelper<Appointment>();

const statusConfig: Record<
  AppointmentStatus,
  { label: string; color: 'warning' | 'info' | 'primary' | 'success' | 'error' | 'default' }
> = {
  [AppointmentStatus.PENDING]: { label: 'Pendiente', color: 'warning' },
  [AppointmentStatus.CONFIRMED]: { label: 'Confirmada', color: 'info' },
  [AppointmentStatus.IN_PROGRESS]: { label: 'En progreso', color: 'primary' },
  [AppointmentStatus.COMPLETED]: { label: 'Completada', color: 'success' },
  [AppointmentStatus.CANCELLED]: { label: 'Cancelada', color: 'error' },
  [AppointmentStatus.NO_SHOW]: { label: 'No asistió', color: 'default' },
};

const statusOptions = [
  { value: '', label: 'Todos' },
  { value: AppointmentStatus.PENDING, label: 'Pendiente' },
  { value: AppointmentStatus.CONFIRMED, label: 'Confirmada' },
  { value: AppointmentStatus.IN_PROGRESS, label: 'En progreso' },
  { value: AppointmentStatus.COMPLETED, label: 'Completada' },
  { value: AppointmentStatus.CANCELLED, label: 'Cancelada' },
  { value: AppointmentStatus.NO_SHOW, label: 'No asistió' },
];

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);

  return date.toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

interface ClinicalNotesTableProps {
  data: PaginatedResponse<Appointment>;
  loading: boolean;
  error: string | null;
  pagination: {
    searchValue: string;
    currentPage: number;
    pageSize: number;
    orderBy: string;
    orderByMode: 'asc' | 'desc';
    totalPages: number;
  };
  filters: AppointmentFilters;
  setPagination: React.Dispatch<React.SetStateAction<ClinicalNotesTableProps['pagination']>>;
  debouncedSearch: (value: string) => void;
  updateFilters: (updates: Partial<AppointmentFilters>) => void;
  selectedAppointment: Appointment | null;
  onSelectAppointment: (appointment: Appointment) => void;
  notesCounts: Record<number, number>;
}

export function ClinicalNotesTable({
  data,
  loading,
  error,
  pagination,
  filters,
  setPagination,
  debouncedSearch,
  updateFilters,
  selectedAppointment,
  onSelectAppointment,
  notesCounts,
}: ClinicalNotesTableProps) {
  const theme = useTheme();

  const columns = useMemo(
    () => [
      columnHelper.display({
        id: 'patient',
        header: 'Paciente',
        cell: ({ row }) => (
          <Typography
            color="text.primary"
            sx={{
              fontWeight: 500,
              cursor: 'pointer',
              '&:hover': { color: 'primary.main' },
            }}
          >
            {row.original.patient.name} {row.original.patient.lastName}
          </Typography>
        ),
      }),
      columnHelper.display({
        id: 'doctor',
        header: 'Doctor',
        cell: ({ row }) => (
          <Typography variant="body2">
            Dr. {row.original.schedule.doctor.name} {row.original.schedule.doctor.lastName}
          </Typography>
        ),
      }),
      columnHelper.display({
        id: 'specialty',
        header: 'Especialidad',
        cell: ({ row }) => (
          <Typography variant="body2">{row.original.schedule.specialty.name}</Typography>
        ),
      }),
      columnHelper.display({
        id: 'date',
        header: 'Fecha',
        cell: ({ row }) => (
          <Typography variant="body2">
            {formatDate(row.original.schedule.scheduleDate)}
          </Typography>
        ),
      }),
      columnHelper.accessor('status', {
        header: 'Estado',
        cell: ({ row }) => {
          const config = statusConfig[row.original.status] ?? {
            label: row.original.status,
            color: 'default' as const,
          };

          return <Chip label={config.label} size="small" color={config.color} />;
        },
      }),
      columnHelper.display({
        id: 'notes',
        header: 'Notas',
        cell: ({ row }) => {
          const count = notesCounts[row.original.id] ?? 0;

          return (
            <Typography variant="body2" color={count > 0 ? 'primary.main' : 'text.secondary'}>
              {count > 0 ? `📋 ${count} nota${count !== 1 ? 's' : ''}` : '—'}
            </Typography>
          );
        },
      }),
    ],
    [notesCounts],
  );

  const table = useReactTable({
    data: data.rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: pagination.totalPages,
    state: {
      pagination: {
        pageIndex: pagination.currentPage - 1,
        pageSize: pagination.pageSize,
      },
    },
  });

  return (
    <>
      {/* Cabecera y filtros */}
      <Box sx={{ mb: 3 }}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: { xs: 'flex-start', sm: 'center' },
            flexDirection: { xs: 'column', sm: 'row' },
            gap: 2,
            mb: 2,
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Listado de Citas ({data.totalRows})
          </Typography>

          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <TextField
              type="date"
              size="small"
              label="Desde"
              value={filters.dateFrom ?? ''}
              onChange={(e) => updateFilters({ dateFrom: e.target.value || undefined })}
              slotProps={{ inputLabel: { shrink: true } }}
              sx={{ minWidth: 150 }}
            />

            <TextField
              type="date"
              size="small"
              label="Hasta"
              value={filters.dateTo ?? ''}
              onChange={(e) => updateFilters({ dateTo: e.target.value || undefined })}
              slotProps={{ inputLabel: { shrink: true } }}
              sx={{ minWidth: 150 }}
            />

            <FormControl size="small" sx={{ minWidth: 140 }}>
              <Select
                value={filters.status ?? ''}
                onChange={(e) => updateFilters({ status: (e.target.value as AppointmentStatus) || undefined })}
                displayEmpty
              >
                {statusOptions.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <DebouncedInput
              placeholder="Buscar..."
              onChange={debouncedSearch}
              sx={{ minWidth: 200 }}
              InputProps={{
                startAdornment: (
                  <i
                    className="ri-search-line"
                    style={{ fontSize: 18, marginRight: 8, color: theme.palette.text.secondary }}
                  />
                ),
              }}
            />
          </Box>
        </Box>
      </Box>

      <Card>
        <Box sx={{ p: 3 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <TableContainer>
            <Table>
              <TableHead>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableCell key={header.id} sx={{ fontWeight: 600 }}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableHead>
              <TableBody>
                {loading ? (
                  <SkeletonTable rowsNum={pagination.pageSize} colNum={columns.length} />
                ) : table.getRowModel().rows.length > 0 ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      hover
                      selected={selectedAppointment?.id === row.original.id}
                      sx={{ cursor: 'pointer' }}
                      onClick={() => onSelectAppointment(row.original)}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={columns.length} sx={{ textAlign: 'center', py: 4 }}>
                      <Typography color="text.secondary">No hay citas disponibles</Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            component="div"
            rowsPerPageOptions={[8, 15, 25]}
            count={data.totalRows}
            rowsPerPage={pagination.pageSize}
            page={pagination.currentPage - 1}
            labelRowsPerPage="Filas por página:"
            onPageChange={(_, page) =>
              setPagination((prev) => ({ ...prev, currentPage: page + 1 }))
            }
            onRowsPerPageChange={(e) =>
              setPagination((prev) => ({
                ...prev,
                pageSize: Number(e.target.value),
                currentPage: 1,
              }))
            }
          />
        </Box>
      </Card>
    </>
  );
}
