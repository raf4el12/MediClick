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
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { SkeletonTable } from '@/components/shared/SkeletonTable';
import type { Patient } from '../types';
import type { PaginatedResponse } from '@/types/pagination.types';
import { PatientFilters } from './PatientFilters';
import { AddPatientDrawer } from './AddPatientDrawer';

const columnHelper = createColumnHelper<Patient>();

interface PatientsTableProps {
  data: PaginatedResponse<Patient>;
  loading: boolean;
  error: string | null;
  pagination: {
    searchValue: string;
    currentPage: number;
    pageSize: number;
    orderBy: string;
    orderByMode: 'asc' | 'desc';
    totalPages: number;
    statusFilter: 'all' | 'active' | 'inactive';
  };
  setPagination: React.Dispatch<React.SetStateAction<PatientsTableProps['pagination']>>;
  debouncedSearch: (value: string) => void;
  setStatusFilter: (value: 'all' | 'active' | 'inactive') => void;
  drawerOpen: boolean;
  openCreateDrawer: () => void;
  closeDrawer: () => void;
  openDetail: (patient: Patient) => void;
  refreshData: () => void;
}

function getAge(birthday: string | null): string {
  if (!birthday) return 'N/A';
  const diff = Date.now() - new Date(birthday).getTime();
  return `${Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000))}`;
}

function formatGender(gender: string | null): string {
  if (!gender) return 'N/A';
  if (gender === 'M') return 'Masculino';
  if (gender === 'F') return 'Femenino';
  return gender;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'N/A';
  const date = new Date(dateStr);
  return date.toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

const bloodTypeColors: Record<string, 'error' | 'primary' | 'secondary' | 'warning' | 'info' | 'success'> = {
  'O+': 'error',
  'O-': 'warning',
  'A+': 'primary',
  'A-': 'info',
  'B+': 'secondary',
  'B-': 'warning',
  'AB+': 'success',
  'AB-': 'info',
};

export function PatientsTable({
  data,
  loading,
  error,
  pagination,
  setPagination,
  debouncedSearch,
  setStatusFilter,
  drawerOpen,
  openCreateDrawer,
  closeDrawer,
  openDetail,
  refreshData,
}: PatientsTableProps) {
  const columns = useMemo(
    () => [
      columnHelper.display({
        id: 'fullName',
        header: 'Nombre',
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
            {row.original.profile.name} {row.original.profile.lastName}
          </Typography>
        ),
      }),
      columnHelper.display({
        id: 'contact',
        header: 'Contacto',
        cell: ({ row }) => (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <i className="ri-mail-line" style={{ fontSize: 14, opacity: 0.6 }} />
              <Typography variant="body2" color="text.secondary">
                {row.original.profile.email}
              </Typography>
            </Box>
            {row.original.profile.phone && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <i className="ri-phone-line" style={{ fontSize: 14, opacity: 0.6 }} />
                <Typography variant="body2" color="text.secondary">
                  {row.original.profile.phone}
                </Typography>
              </Box>
            )}
          </Box>
        ),
      }),
      columnHelper.display({
        id: 'age',
        header: 'Edad',
        cell: ({ row }) => (
          <Typography>
            {getAge(row.original.profile.birthday)} años
          </Typography>
        ),
      }),
      columnHelper.display({
        id: 'gender',
        header: 'Género',
        cell: ({ row }) => (
          <Typography>
            {formatGender(row.original.profile.gender)}
          </Typography>
        ),
      }),
      columnHelper.accessor('bloodType', {
        header: 'Sangre',
        cell: ({ row }) => (
          <Chip
            label={row.original.bloodType}
            size="small"
            variant="outlined"
            color={bloodTypeColors[row.original.bloodType] ?? 'default'}
          />
        ),
      }),
      columnHelper.display({
        id: 'lastVisit',
        header: 'Última visita',
        cell: ({ row }) => (
          <Typography variant="body2">
            {formatDate(row.original.createdAt)}
          </Typography>
        ),
      }),
      columnHelper.accessor('isActive', {
        header: 'Estado',
        cell: ({ row }) => (
          <Chip
            label={row.original.isActive ? 'Activo' : 'Inactivo'}
            size="small"
            color={row.original.isActive ? 'success' : 'warning'}
          />
        ),
      }),
    ],
    [openDetail],
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

  const totalPatients = (data.activeCount ?? 0) + (data.inactiveCount ?? 0);

  return (
    <>
      <PatientFilters
        onSearch={debouncedSearch}
        onAddClick={openCreateDrawer}
        statusFilter={pagination.statusFilter}
        onStatusFilterChange={setStatusFilter}
        totalPatients={totalPatients}
        activeCount={data.activeCount ?? 0}
        inactiveCount={data.inactiveCount ?? 0}
      />

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
                    ))}
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
                      sx={{ cursor: 'pointer' }}
                      onClick={() => openDetail(row.original)}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      sx={{ textAlign: 'center', py: 4 }}
                    >
                      <Typography color="text.secondary">
                        No hay pacientes disponibles
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

      <AddPatientDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        onSuccess={refreshData}
      />
    </>
  );
}
