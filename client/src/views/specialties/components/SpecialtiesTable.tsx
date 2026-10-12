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
import type { Category, Specialty } from '../types';
import { AddSpecialtyDrawer } from './AddSpecialtyDrawer';
import { SpecialtyFilters } from './SpecialtyFilters';

const columnHelper = createColumnHelper<Specialty>();

interface SpecialtiesTableProps {
  data: PaginatedResponse<Specialty>;
  categories: Category[];
  clinics: Clinic[];
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
  setPagination: (updater: React.SetStateAction<SpecialtiesTableProps['pagination']>) => void;
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
  onSaved: () => void;
}

/** Lista de especialidades sobre `DataTable` (patrón `user/list` de Materio). */
export function SpecialtiesTable({
  data,
  categories,
  clinics,
  loading,
  error,
  pagination,
  setPagination,
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
  onSaved,
}: SpecialtiesTableProps) {
  const columns = useMemo(
    () => [
      columnHelper.accessor('name', {
        header: 'Nombre',
        enableSorting: true,
        cell: ({ row }) => (
          <Typography color='text.primary' className='font-medium'>
            {row.original.name}
          </Typography>
        ),
      }),
      columnHelper.accessor('category', {
        header: 'Categoría',
        cell: ({ row }) => <Chip label={row.original.category.name} size='small' variant='outlined' />,
      }),
      columnHelper.accessor('clinicId', {
        header: 'Sede',
        meta: { hiddenOnMobile: true },
        cell: ({ row }) => {
          const clinic = clinics.find((c) => c.id === row.original.clinicId);
          return <Chip label={clinic ? clinic.name : 'Global'} size='small' variant={clinic ? 'tonal' : 'outlined'} color={clinic ? 'info' : 'default'} />;
        },
      }),
      columnHelper.accessor('duration', {
        header: 'Duración',
        enableSorting: true,
        meta: { hiddenOnMobile: true },
        cell: ({ row }) => <Typography>{row.original.duration ? `${row.original.duration} min` : '—'}</Typography>,
      }),
      columnHelper.accessor('price', {
        header: 'Precio',
        enableSorting: true,
        meta: { hiddenOnMobile: true },
        cell: ({ row }) => <Typography>{row.original.price != null ? `S/ ${row.original.price.toFixed(2)}` : '—'}</Typography>,
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
        <SpecialtyFilters
          categories={categories}
          selectedCategory={pagination.categoryId}
          onCategoryChange={handleCategoryFilter}
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
          label='Especialidades'
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
              <Typography>No hay especialidades que coincidan.</Typography>
              <Button variant='outlined' size='small' startIcon={<i className='ri-add-line' aria-hidden />} onClick={openCreateDrawer}>
                Registrar especialidad
              </Button>
            </div>
          }
        />
      </Card>

      <AddSpecialtyDrawer open={drawerOpen} drawerData={drawerData} categories={categories} clinics={clinics} onClose={closeDrawer} onSuccess={onSaved} />

      <ConfirmDialog
        open={confirmDialogOpen}
        title='Eliminar especialidad'
        description='¿Seguro que quieres eliminar esta especialidad? Esta acción no se puede deshacer.'
        destructive={false}
        onConfirm={() => void handleDelete(true)}
        onCancel={() => setConfirmDialogOpen(false)}
      />
    </>
  );
}
