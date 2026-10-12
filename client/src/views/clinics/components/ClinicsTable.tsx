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
import type { Clinic } from '../types';
import { AddClinicDrawer } from './AddClinicDrawer';
import { ClinicFilters } from './ClinicFilters';

const columnHelper = createColumnHelper<Clinic>();

interface ClinicsTableProps {
  data: PaginatedResponse<Clinic>;
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
  setPagination: React.Dispatch<React.SetStateAction<ClinicsTableProps['pagination']>>;
  drawerOpen: boolean;
  drawerData: { data: Clinic | null; action: 'Create' | 'Update' };
  openCreateDrawer: () => void;
  openEditDrawer: (clinic: Clinic) => void;
  closeDrawer: () => void;
  confirmDialogOpen: boolean;
  setConfirmDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
  openDeleteDialog: (id: number) => void;
  handleDelete: (confirmed: boolean) => void;
  refreshData: () => void;
  onSaved: () => void;
}

/** Lista de sedes sobre `DataTable` (patrón `user/list` de Materio). */
export function ClinicsTable({
  data,
  loading,
  error,
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
}: ClinicsTableProps) {
  const columns = useMemo(
    () => [
      columnHelper.accessor('name', {
        header: 'Nombre',
        enableSorting: true,
        cell: ({ row }) => (
          <div className='flex flex-col'>
            <Typography color='text.primary' className='font-medium'>
              {row.original.name}
            </Typography>
            {row.original.address && <Typography variant='body2'>{row.original.address}</Typography>}
          </div>
        ),
      }),
      columnHelper.accessor('timezone', {
        header: 'Zona horaria',
        enableSorting: true,
        meta: { hiddenOnMobile: true },
        cell: ({ row }) => <Typography>{row.original.timezone}</Typography>,
      }),
      columnHelper.accessor('currency', {
        header: 'Moneda',
        enableSorting: true,
        meta: { align: 'center' },
        cell: ({ row }) => <Chip label={row.original.currency} size='small' variant='outlined' />,
      }),
      columnHelper.accessor('phone', {
        header: 'Teléfono',
        enableSorting: true,
        meta: { hiddenOnMobile: true },
        cell: ({ row }) => <Typography>{row.original.phone ?? '—'}</Typography>,
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
    [openEditDrawer, openDeleteDialog],
  );

  return (
    <>
      <Card>
        <ClinicFilters
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
          label='Sedes'
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
              <Typography>No hay sedes que coincidan.</Typography>
              <Button variant='outlined' size='small' startIcon={<i className='ri-add-line' aria-hidden />} onClick={openCreateDrawer}>
                Registrar sede
              </Button>
            </div>
          }
        />
      </Card>

      <AddClinicDrawer open={drawerOpen} drawerData={drawerData} onClose={closeDrawer} onSuccess={onSaved} />

      <ConfirmDialog
        open={confirmDialogOpen}
        title='Eliminar sede'
        description='¿Seguro que quieres eliminar esta sede? Esta acción no se puede deshacer.'
        destructive={false}
        onConfirm={() => void handleDelete(true)}
        onCancel={() => setConfirmDialogOpen(false)}
      />
    </>
  );
}
