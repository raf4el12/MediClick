'use client';

import { useMemo } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import { createColumnHelper } from '@tanstack/react-table';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { DataTable } from '@/components/shared/DataTable';
import type { PaginatedResponse } from '@/types/pagination.types';
import type { Clinic } from '@/views/clinics/types';
import type { Category } from '../types';
import { AddCategoryDrawer } from './AddCategoryDrawer';
import { CategoryFilters } from './CategoryFilters';

const columnHelper = createColumnHelper<Category>();

interface CategoriesTableProps {
  data: PaginatedResponse<Category>;
  loading: boolean;
  error: string | null;
  clinics: Clinic[];
  pagination: {
    searchValue: string;
    currentPage: number;
    pageSize: number;
    orderBy: string;
    orderByMode: 'asc' | 'desc';
    totalPages: number;
  };
  setPagination: (updater: React.SetStateAction<CategoriesTableProps['pagination']>) => void;
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
  onSaved: () => void;
}

/** Lista de categorías sobre `DataTable` (patrón `user/list` de Materio). */
export function CategoriesTable({
  data,
  loading,
  error,
  clinics,
  pagination,
  setPagination,
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
  onSaved,
}: CategoriesTableProps) {
  const columns = useMemo(
    () => [
      columnHelper.accessor('name', {
        header: 'Nombre',
        enableSorting: true,
        cell: ({ row }) => (
          <div className='flex items-center gap-3'>
            {row.original.icon && <i className={`${row.original.icon} text-xl`} aria-hidden />}
            <Typography color='text.primary' className='font-medium'>
              {row.original.name}
            </Typography>
          </div>
        ),
      }),
      columnHelper.accessor('description', {
        header: 'Descripción',
        meta: { hiddenOnMobile: true },
        cell: ({ row }) => <Typography className='max-is-[300px] truncate'>{row.original.description ?? 'Sin descripción'}</Typography>,
      }),
      columnHelper.accessor('clinicId', {
        header: 'Sede',
        meta: { hiddenOnMobile: true },
        cell: ({ row }) => {
          const clinic = clinics.find((c) => c.id === row.original.clinicId);
          return <Chip label={clinic ? clinic.name : 'Global'} size='small' variant={clinic ? 'tonal' : 'outlined'} color={clinic ? 'info' : 'default'} />;
        },
      }),
      columnHelper.accessor('order', {
        header: 'Orden',
        enableSorting: true,
        meta: { align: 'center' },
        cell: ({ row }) => <Typography>{row.original.order ?? '—'}</Typography>,
      }),
      columnHelper.accessor('isActive', {
        header: 'Estado',
        enableSorting: true,
        meta: { align: 'center' },
        cell: ({ row }) => (
          <Chip
            variant='tonal'
            size='small'
            label={row.original.isActive ? 'Activa' : 'Inactiva'}
            color={row.original.isActive ? 'success' : 'secondary'}
          />
        ),
      }),
      columnHelper.display({
        id: 'actions',
        header: 'Acciones',
        meta: { align: 'center' },
        cell: ({ row }) => (
          <div className='flex justify-center'>
            <IconButton aria-label={`Editar ${row.original.name}`} onClick={() => openEditDrawer(row.original)}>
              <i className='ri-pencil-line text-textSecondary' aria-hidden />
            </IconButton>
            <IconButton aria-label={`Eliminar ${row.original.name}`} onClick={() => openDeleteDialog(row.original.id)}>
              <i className='ri-delete-bin-7-line text-textSecondary' aria-hidden />
            </IconButton>
          </div>
        ),
      }),
    ],
    [openEditDrawer, openDeleteDialog, clinics],
  );

  return (
    <>
      <Card>
        <CategoryFilters
          searchValue={pagination.searchValue}
          onSearch={(searchValue) => setPagination((prev) => ({ ...prev, searchValue, currentPage: 1 }))}
          onAddClick={openCreateDrawer}
        />
        <Divider />
        {error && (
          <Alert
            severity='error'
            className='m-5'
            action={
              <Button color='inherit' size='small' onClick={refreshData}>
                Reintentar
              </Button>
            }
          >
            {error}
          </Alert>
        )}
        <DataTable
          label='Categorías'
          columns={columns}
          rows={data.rows}
          totalRows={data.totalRows}
          isLoading={loading}
          pagination={{ pageIndex: pagination.currentPage - 1, pageSize: pagination.pageSize }}
          onPaginationChange={({ pageIndex, pageSize }) => setPagination((prev) => ({ ...prev, currentPage: pageIndex + 1, pageSize }))}
          pageSizeOptions={[8, 15, 25]}
          sorting={{ id: pagination.orderBy, desc: pagination.orderByMode === 'desc' }}
          onSortingChange={({ id, desc }) => setPagination((prev) => ({ ...prev, orderBy: id, orderByMode: desc ? 'desc' : 'asc', currentPage: 1 }))}
          emptyMessage={
            <div className='flex flex-col items-center gap-3 plb-6'>
              <Typography>No hay categorías que coincidan.</Typography>
              <Button variant='outlined' size='small' startIcon={<i className='ri-add-line' aria-hidden />} onClick={openCreateDrawer}>
                Registrar categoría
              </Button>
            </div>
          }
        />
      </Card>

      <AddCategoryDrawer open={drawerOpen} drawerData={drawerData} clinics={clinics} onClose={closeDrawer} onSuccess={onSaved} />

      <ConfirmDialog
        open={confirmDialogOpen}
        title='Eliminar categoría'
        description='¿Seguro que quieres eliminar esta categoría? Esta acción no se puede deshacer.'
        destructive={false}
        onConfirm={() => void handleDelete(true)}
        onCancel={() => setConfirmDialogOpen(false)}
      />
    </>
  );
}
