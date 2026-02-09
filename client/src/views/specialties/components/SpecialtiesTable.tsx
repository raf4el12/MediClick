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
import type { Specialty, Category } from '../types';
import type { PaginatedResponse } from '@/types/pagination.types';
import { SpecialtyFilters } from './SpecialtyFilters';
import { AddSpecialtyDrawer } from './AddSpecialtyDrawer';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';

const columnHelper = createColumnHelper<Specialty>();

interface SpecialtiesTableProps {
  data: PaginatedResponse<Specialty>;
  categories: Category[];
  loading: boolean;
  error: string | null;
  pagination: {
    searchValue: string;
    currentPage: number;
    pageSize: number;
    orderBy: string;
    orderByMode: 'asc' | 'desc';
    totalPages: number;
    categoryId?: number;
  };
  setPagination: React.Dispatch<React.SetStateAction<SpecialtiesTableProps['pagination']>>;
  debouncedSearch: (value: string) => void;
  handleCategoryFilter: (categoryId: number | undefined) => void;
  drawerOpen: boolean;
  drawerData: { data: Specialty | null; action: 'Create' | 'Update' };
  openCreateDrawer: () => void;
  openEditDrawer: (specialty: Specialty) => void;
  closeDrawer: () => void;
  confirmDialogOpen: boolean;
  setConfirmDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
  openDeleteDialog: (id: number) => void;
  handleDelete: (confirmed: boolean) => void;
  refreshData: () => void;
}

export function SpecialtiesTable({
  data,
  categories,
  loading,
  error,
  pagination,
  setPagination,
  debouncedSearch,
  handleCategoryFilter,
  drawerOpen,
  drawerData,
  openCreateDrawer,
  openEditDrawer,
  closeDrawer,
  confirmDialogOpen,
  setConfirmDialogOpen,
  openDeleteDialog,
  handleDelete,
  refreshData,
}: SpecialtiesTableProps) {
  const columns = useMemo(
    () => [
      columnHelper.accessor('name', {
        header: 'Nombre',
        cell: ({ row }) => (
          <Typography color="text.primary" sx={{ fontWeight: 500 }}>
            {row.original.name}
          </Typography>
        ),
      }),
      columnHelper.accessor('category', {
        header: 'Categoría',
        cell: ({ row }) => (
          <Chip
            label={row.original.category.name}
            size="small"
            variant="outlined"
            color="primary"
          />
        ),
      }),
      columnHelper.accessor('duration', {
        header: 'Duración',
        cell: ({ row }) => (
          <Typography>
            {row.original.duration ? `${row.original.duration} min` : 'N/A'}
          </Typography>
        ),
      }),
      columnHelper.accessor('price', {
        header: 'Precio',
        cell: ({ row }) => (
          <Typography>
            {row.original.price != null
              ? `S/ ${row.original.price.toFixed(2)}`
              : 'N/A'}
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
              onClick={() => openEditDrawer(row.original)}
            >
              <i className="ri-pencil-line" style={{ fontSize: 18 }} />
            </IconButton>
            <IconButton
              size="small"
              color="error"
              onClick={() => openDeleteDialog(row.original.id)}
            >
              <i className="ri-delete-bin-line" style={{ fontSize: 18 }} />
            </IconButton>
          </Box>
        ),
      }),
    ],
    [openEditDrawer, openDeleteDialog],
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
          <SpecialtyFilters
            categories={categories}
            selectedCategory={pagination.categoryId}
            onCategoryChange={handleCategoryFilter}
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
                              if (header.id === 'actions') return;
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
                            hideSortIcon={header.id === 'actions'}
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
                        No hay especialidades disponibles
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

      <AddSpecialtyDrawer
        open={drawerOpen}
        drawerData={drawerData}
        categories={categories}
        onClose={closeDrawer}
        onSuccess={refreshData}
      />

      <ConfirmDialog
        open={confirmDialogOpen}
        title="Eliminar Especialidad"
        description="¿Estás seguro de que deseas eliminar esta especialidad? Esta acción no se puede deshacer."
        onConfirm={() => void handleDelete(true)}
        onCancel={() => setConfirmDialogOpen(false)}
      />
    </>
  );
}
