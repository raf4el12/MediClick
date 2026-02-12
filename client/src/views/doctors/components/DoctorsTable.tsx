'use client';

import { useMemo } from 'react';
import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
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
import type { Doctor } from '../types';
import type { Specialty } from '@/views/specialties/types';
import type { PaginatedResponse } from '@/types/pagination.types';
import { DoctorFilters } from './DoctorFilters';
import { AddDoctorDrawer } from './AddDoctorDrawer';

const columnHelper = createColumnHelper<Doctor>();

interface DoctorsTableProps {
  data: PaginatedResponse<Doctor>;
  specialties: Specialty[];
  loading: boolean;
  error: string | null;
  pagination: {
    searchValue: string;
    currentPage: number;
    pageSize: number;
    orderBy: string;
    orderByMode: 'asc' | 'desc';
    totalPages: number;
    specialtyId?: number;
  };
  setPagination: React.Dispatch<React.SetStateAction<DoctorsTableProps['pagination']>>;
  debouncedSearch: (value: string) => void;
  handleSpecialtyFilter: (specialtyId: number | undefined) => void;
  drawerOpen: boolean;
  openCreateDrawer: () => void;
  closeDrawer: () => void;
  openDetail: (doctor: Doctor) => void;
  refreshData: () => void;
}

export function DoctorsTable({
  data,
  specialties,
  loading,
  error,
  pagination,
  setPagination,
  debouncedSearch,
  handleSpecialtyFilter,
  drawerOpen,
  openCreateDrawer,
  closeDrawer,
  openDetail,
  refreshData,
}: DoctorsTableProps) {
  const columns = useMemo(
    () => [
      columnHelper.display({
        id: 'fullName',
        header: 'Doctor',
        cell: ({ row }) => (
          <Box>
            <Typography color="text.primary" sx={{ fontWeight: 500 }}>
              {row.original.profile.name} {row.original.profile.lastName}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {row.original.profile.email}
            </Typography>
          </Box>
        ),
      }),
      columnHelper.accessor('licenseNumber', {
        header: 'CMP',
        cell: ({ row }) => (
          <Typography>{row.original.licenseNumber}</Typography>
        ),
      }),
      columnHelper.display({
        id: 'specialties',
        header: 'Especialidades',
        cell: ({ row }) => (
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
            {row.original.specialties.map((spec) => (
              <Chip
                key={spec.id}
                label={spec.name}
                size="small"
                variant="outlined"
                color="primary"
              />
            ))}
          </Box>
        ),
      }),
      columnHelper.display({
        id: 'phone',
        header: 'Teléfono',
        cell: ({ row }) => (
          <Typography>
            {row.original.profile.phone ?? 'N/A'}
          </Typography>
        ),
      }),
      columnHelper.accessor('isActive', {
        header: 'Estado',
        cell: ({ row }) => (
          <Chip
            label={row.original.isActive ? 'Activo' : 'Inactivo'}
            color={row.original.isActive ? 'success' : 'error'}
            size="small"
          />
        ),
      }),
      columnHelper.display({
        id: 'actions',
        header: 'Acciones',
        cell: ({ row }) => (
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <IconButton
              size="small"
              color="primary"
              onClick={() => openDetail(row.original)}
            >
              <i className="ri-eye-line" style={{ fontSize: 18 }} />
            </IconButton>
          </Box>
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

  return (
    <>
      <Card>
        <Box sx={{ p: 3, pt: 4 }}>
          <DoctorFilters
            specialties={specialties}
            selectedSpecialty={pagination.specialtyId}
            onSpecialtyChange={handleSpecialtyFilter}
            onSearch={debouncedSearch}
            onAddClick={openCreateDrawer}
          />

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
                              if (header.id === 'actions' || header.id === 'specialties') return;
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
                            hideSortIcon={header.id === 'actions' || header.id === 'specialties'}
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
                    <TableRow key={row.id} hover>
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
                        No hay doctores disponibles
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

      <AddDoctorDrawer
        open={drawerOpen}
        specialties={specialties}
        onClose={closeDrawer}
        onSuccess={refreshData}
      />
    </>
  );
}
