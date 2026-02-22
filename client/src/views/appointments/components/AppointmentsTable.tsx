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
import TableSortLabel from '@mui/material/TableSortLabel';
import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { SkeletonTable } from '@/components/shared/SkeletonTable';
import type { PaginatedResponse } from '@/types/pagination.types';
import { AppointmentFilters } from './AppointmentFilters';
import {
  type Appointment,
  type AppointmentFilters as AppointmentFiltersType,
  AppointmentStatus,
} from '../types';

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

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

interface AppointmentsTableProps {
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
  filters: AppointmentFiltersType;
  setPagination: React.Dispatch<React.SetStateAction<AppointmentsTableProps['pagination']>>;
  debouncedSearch: (value: string) => void;
  updateFilters: (updates: Partial<AppointmentFiltersType>) => void;
  openCreateDialog: () => void;
  openDetail: (appointment: Appointment) => void;
  handleCheckIn: (id: number) => void;
  openCancelDialog: (appointment: Appointment) => void;
  openRescheduleDialog: (appointment: Appointment) => void;
  handleComplete: (id: number) => void;
}

export function AppointmentsTable({
  data,
  loading,
  error,
  pagination,
  filters,
  setPagination,
  debouncedSearch,
  updateFilters,
  openCreateDialog,
  openDetail,
  handleCheckIn,
  openCancelDialog,
  openRescheduleDialog,
  handleComplete,
}: AppointmentsTableProps) {
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
            onClick={() => openDetail(row.original)}
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
          <Typography variant="body2">
            {row.original.schedule.specialty.name}
          </Typography>
        ),
        meta: { hiddenOnMobile: true },
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
      columnHelper.display({
        id: 'time',
        header: 'Hora',
        cell: ({ row }) => (
          <Typography variant="body2">
            {row.original.schedule.timeFrom} - {row.original.schedule.timeTo}
          </Typography>
        ),
        meta: { hiddenOnMobile: true },
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
        id: 'actions',
        header: 'Acciones',
        cell: ({ row }) => {
          const { status, id } = row.original;
          const canCheckIn =
            status === AppointmentStatus.PENDING ||
            status === AppointmentStatus.CONFIRMED;
          const canCancel =
            status === AppointmentStatus.PENDING ||
            status === AppointmentStatus.CONFIRMED ||
            status === AppointmentStatus.IN_PROGRESS;
          const canReschedule =
            status === AppointmentStatus.PENDING ||
            status === AppointmentStatus.CONFIRMED;
          const canComplete = status === AppointmentStatus.IN_PROGRESS;

          return (
            <Box sx={{ display: 'flex', gap: 0.5 }} onClick={(e) => e.stopPropagation()}>
              {canCheckIn && (
                <Tooltip title="Check-in">
                  <IconButton size="small" color="primary" aria-label="Registrar entrada" onClick={() => handleCheckIn(id)}>
                    <i className="ri-login-box-line" style={{ fontSize: 18 }} />
                  </IconButton>
                </Tooltip>
              )}
              {canReschedule && (
                <Tooltip title="Reagendar">
                  <IconButton
                    size="small"
                    color="info"
                    aria-label="Reagendar cita"
                    onClick={() => openRescheduleDialog(row.original)}
                  >
                    <i className="ri-calendar-schedule-line" style={{ fontSize: 18 }} />
                  </IconButton>
                </Tooltip>
              )}
              {canComplete && (
                <Tooltip title="Completar">
                  <IconButton size="small" color="success" aria-label="Completar cita" onClick={() => handleComplete(id)}>
                    <i className="ri-check-double-line" style={{ fontSize: 18 }} />
                  </IconButton>
                </Tooltip>
              )}
              {canCancel && (
                <Tooltip title="Cancelar">
                  <IconButton
                    size="small"
                    color="error"
                    aria-label="Cancelar cita"
                    onClick={() => openCancelDialog(row.original)}
                  >
                    <i className="ri-close-circle-line" style={{ fontSize: 18 }} />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
          );
        },
      }),
    ],
    [openDetail, handleCheckIn, openCancelDialog, openRescheduleDialog, handleComplete],
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
      <AppointmentFilters
        onSearch={debouncedSearch}
        onAddClick={openCreateDialog}
        totalAppointments={data.totalRows}
        filters={filters}
        onFilterChange={updateFilters}
      />

      <Card>
        <Box sx={{ p: 3 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <TableContainer sx={{ overflowX: 'auto' }}>
            <Table sx={{ minWidth: 700 }}>
              <TableHead>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => {
                      const isHiddenOnMobile = (header.column.columnDef.meta as Record<string, boolean> | undefined)?.hiddenOnMobile;
                      return (
                        <TableCell
                          key={header.id}
                          sx={{
                            fontWeight: 600,
                            ...(isHiddenOnMobile && { display: { xs: 'none', sm: 'table-cell' } }),
                          }}
                        >
                          {header.isPlaceholder ? null : (
                            <TableSortLabel
                              active={pagination.orderBy === header.id}
                              direction={
                                pagination.orderBy === header.id
                                  ? pagination.orderByMode
                                  : 'asc'
                              }
                              onClick={() => {
                                setPagination((prev) => ({
                                  ...prev,
                                  orderBy: header.id,
                                  orderByMode:
                                    prev.orderBy === header.id &&
                                      prev.orderByMode === 'asc'
                                      ? 'desc'
                                      : 'asc',
                                  currentPage: 1,
                                }));
                              }}
                            >
                              {flexRender(
                                header.column.columnDef.header,
                                header.getContext(),
                              )}
                            </TableSortLabel>
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableHead>
              <TableBody>
                {loading ? (
                  <SkeletonTable
                    rowsNum={pagination.pageSize}
                    colNum={columns.length}
                  />
                ) : table.getRowModel().rows.length > 0 ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      hover
                      tabIndex={0}
                      sx={{ cursor: 'pointer' }}
                      onClick={() => openDetail(row.original)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          openDetail(row.original);
                        }
                      }}
                    >
                      {row.getVisibleCells().map((cell) => {
                        const isHiddenOnMobile = (cell.column.columnDef.meta as Record<string, boolean> | undefined)?.hiddenOnMobile;
                        return (
                          <TableCell
                            key={cell.id}
                            sx={isHiddenOnMobile ? { display: { xs: 'none', sm: 'table-cell' } } : undefined}
                          >
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext(),
                            )}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      sx={{ textAlign: 'center', py: 4 }}
                    >
                      <Typography color="text.secondary">
                        No hay citas disponibles
                      </Typography>
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
              setPagination((prev) => ({
                ...prev,
                currentPage: page + 1,
              }))
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
