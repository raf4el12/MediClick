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
import Button from '@mui/material/Button';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { SkeletonTable } from '@/components/shared/SkeletonTable';
import type { Category } from '../types';
import type { PaginatedResponse } from '@/types/pagination.types';
import { CategoryFilters } from './CategoryFilters';
import { AddCategoryDrawer } from './AddCategoryDrawer';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';

const columnHelper = createColumnHelper<Category>();

interface CategoriesTableProps {
  data: PaginatedResponse<Category>;
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
  setPagination: React.Dispatch<React.SetStateAction<CategoriesTableProps['pagination']>>;
  debouncedSearch: (value: string) => void;
  drawerOpen: boolean;
  drawerData: { data: Category | null; action: 'Create' | 'Update' };
  openCreateDrawer: () => void;
  openEditDrawer: (category: Category) => void;
  closeDrawer: () => void;
  confirmDialogOpen: boolean;
  setConfirmDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
  openDeleteDialog: (id: number) => void;
  handleDelete: (confirmed: boolean) => void;
  refreshData: () => void;
}

export function CategoriesTable({
  data,
  loading,
  error,
  pagination,
  setPagination,
  debouncedSearch,
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
}: CategoriesTableProps) {
  const columns = useMemo(
    () => [
      columnHelper.accessor('name', {
        header: 'Nombre',
        cell: ({ row }) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            {row.original.icon && (
              <i className={row.original.icon} style={{ fontSize: 20 }} />
            )}
            <Typography color="text.primary" sx={{ fontWeight: 500 }}>
              {row.original.name}
            </Typography>
          </Box>
        ),
      }),
      columnHelper.accessor('description', {
        header: 'Descripción',
        cell: ({ row }) => (
          <Typography
            color="text.secondary"
            sx={{
              maxWidth: 300,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {row.original.description ?? 'Sin descripción'}
          </Typography>
        ),
        meta: { hiddenOnMobile: true },
      }),
      columnHelper.accessor('order', {
        header: 'Orden',
        cell: ({ row }) => (
          <Typography>{row.original.order ?? '-'}</Typography>
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
              aria-label="Editar categoría"
              onClick={() => openEditDrawer(row.original)}
            >
              <i className="ri-pencil-line" style={{ fontSize: 18 }} />
            </IconButton>
            <IconButton
              size="small"
              color="error"
              aria-label="Eliminar categoría"
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
          <CategoryFilters
            onSearch={debouncedSearch}
            onAddClick={openCreateDrawer}
          />

          {error && (
            <Alert
              severity="error"
              sx={{ mb: 2 }}
              action={
                <Button color="inherit" size="small" onClick={refreshData}>
                  Reintentar
                </Button>
              }
            >
              {error}
            </Alert>
          )}

          <TableContainer sx={{ overflowX: 'auto' }}>
            <Table sx={{ minWidth: 550 }}>
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
                    <TableRow key={row.id} hover>
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
                        No hay categorías disponibles
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

      <AddCategoryDrawer
        open={drawerOpen}
        drawerData={drawerData}
        onClose={closeDrawer}
        onSuccess={refreshData}
      />

      <ConfirmDialog
        open={confirmDialogOpen}
        title="Eliminar Categoría"
        description="¿Estás seguro de que deseas eliminar esta categoría? Esta acción no se puede deshacer."
        onConfirm={() => void handleDelete(true)}
        onCancel={() => setConfirmDialogOpen(false)}
      />
    </>
  );
}
