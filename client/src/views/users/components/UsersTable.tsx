'use client';

import { memo, useCallback, useMemo, useState } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import { createColumnHelper } from '@tanstack/react-table';
import OptionMenu from '@core/components/option-menu';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { DataTable } from '@/components/shared/DataTable';
import type { DataTableSorting } from '@/components/shared/DataTable/DataTable';
import { DebouncedInput } from '@/components/shared/DebouncedInput';
import { useAppDispatch } from '@/redux-store/hooks';
import { deleteUserThunk } from '@/redux-store/thunks/users.thunks';
import type { PaginatedResponse } from '@/types/pagination.types';
import { notify } from '@/utils/notify';
import type { User } from '../types';
import { AddEditUserDrawer } from './AddEditUserDrawer';
import { UserFilters } from './UserFilters';

const columnHelper = createColumnHelper<User>();

const ROLE_LABELS: Record<string, { label: string; color: 'primary' | 'info' | 'success' | 'warning' | 'secondary' }> = {
  ADMIN: { label: 'Administrador', color: 'primary' },
  DOCTOR: { label: 'Médico', color: 'info' },
  RECEPTIONIST: { label: 'Recepcionista', color: 'warning' },
  PATIENT: { label: 'Paciente', color: 'success' },
};

/** Columnas que el servidor sabe ordenar: campos propios de `Users`. */
const SORTABLE = ['name', 'isActive'];

interface UsersTableProps {
  data: PaginatedResponse<User>;
  loading: boolean;
  error: string | null;
  pagination: {
    searchValue: string;
    currentPage: number;
    pageSize: number;
    orderBy: string;
    orderByMode: 'asc' | 'desc';
    totalPages: number;
    role?: string;
  };
  setPagination: (updater: React.SetStateAction<UsersTableProps['pagination']>) => void;
  debouncedSearch: (value: string) => void;
  handleRoleFilter: (role: string | undefined) => void;
  drawerOpen: boolean;
  openCreateDrawer: () => void;
  openEditDrawer: (user: User) => void;
  closeDrawer: () => void;
  openDetail: (user: User) => void;
  editUser: User | null;
  refreshData: () => void;
}

const displayName = (u: User) => (u.profile ? `${u.profile.name} ${u.profile.lastName}` : u.name);

/** Lista de usuarios del personal con el patrón `user/list` de Materio sobre `DataTable`. */
export const UsersTable = memo(function UsersTable({
  data,
  loading,
  error,
  pagination,
  setPagination,
  debouncedSearch,
  handleRoleFilter,
  drawerOpen,
  openCreateDrawer,
  openEditDrawer,
  closeDrawer,
  openDetail,
  editUser,
  refreshData,
}: UsersTableProps) {
  const dispatch = useAppDispatch();
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const result = await dispatch(deleteUserThunk(deleteTarget.id));
    setDeleteTarget(null);
    if (deleteUserThunk.fulfilled.match(result)) {
      refreshData();
      notify('Usuario eliminado');
    } else {
      notify('No se pudo eliminar el usuario', 'error');
    }
  };

  const handleSaved = () => {
    refreshData();
    notify(editUser ? 'Usuario actualizado' : 'Usuario creado');
  };

  const columns = useMemo(
    () => [
      columnHelper.accessor('name', {
        header: 'Usuario',
        enableSorting: true,
        cell: ({ row }) => (
          <div className='flex flex-col'>
            <Typography color='text.primary' className='font-medium'>
              {displayName(row.original)}
            </Typography>
            <Typography variant='body2'>{row.original.email}</Typography>
          </div>
        ),
      }),
      columnHelper.accessor('role', {
        header: 'Rol',
        cell: ({ getValue }) => {
          const role = ROLE_LABELS[getValue()] ?? { label: getValue(), color: 'secondary' as const };
          return <Chip label={role.label} size='small' variant='tonal' color={role.color} />;
        },
      }),
      columnHelper.display({
        id: 'phone',
        header: 'Teléfono',
        meta: { hiddenOnMobile: true },
        cell: ({ row }) => <Typography>{row.original.profile?.phone ?? '—'}</Typography>,
      }),
      columnHelper.accessor('isActive', {
        header: 'Estado',
        enableSorting: true,
        cell: ({ getValue }) => (
          <Chip label={getValue() ? 'Activo' : 'Inactivo'} size='small' variant='tonal' color={getValue() ? 'success' : 'secondary'} />
        ),
      }),
      columnHelper.display({
        id: 'actions',
        header: 'Acciones',
        cell: ({ row }) => (
          <div className='flex items-center'>
            <IconButton aria-label={`Editar a ${displayName(row.original)}`} onClick={() => openEditDrawer(row.original)}>
              <i className='ri-pencil-line text-textSecondary' aria-hidden />
            </IconButton>
            <OptionMenu
              iconButtonProps={{ 'aria-label': `Más acciones para ${displayName(row.original)}` }}
              iconClassName='text-textSecondary'
              options={[
                { text: 'Ver detalle', icon: 'ri-eye-line', menuItemProps: { className: 'flex items-center gap-2', onClick: () => openDetail(row.original) } },
                { text: 'Eliminar', icon: 'ri-delete-bin-7-line', menuItemProps: { className: 'flex items-center gap-2', onClick: () => setDeleteTarget(row.original) } },
              ]}
            />
          </div>
        ),
      }),
    ],
    [openDetail, openEditDrawer],
  );

  // DebouncedInput avisa también al montarse; solo se busca si el texto cambió, para no volver a la página 1.
  const currentSearch = pagination.searchValue;
  const handleSearch = useCallback(
    (value: string) => {
      if (value !== currentSearch) debouncedSearch(value);
    },
    [currentSearch, debouncedSearch],
  );

  const sorting: DataTableSorting | null = SORTABLE.includes(pagination.orderBy)
    ? { id: pagination.orderBy, desc: pagination.orderByMode === 'desc' }
    : null;

  return (
    <Card>
      <CardHeader title='Filtros' />
      <CardContent>
        <UserFilters selectedRole={pagination.role} onRoleChange={handleRoleFilter} />
      </CardContent>
      <Divider />
      <div className='flex flex-col items-start justify-between gap-4 p-5 sm:flex-row sm:items-center'>
        <DebouncedInput
          placeholder='Buscar usuario'
          value={pagination.searchValue}
          onChange={handleSearch}
          className='max-sm:is-full'
          slotProps={{ htmlInput: { 'aria-label': 'Buscar usuario' } }}
        />
        <Button variant='contained' startIcon={<i className='ri-add-line' aria-hidden />} onClick={openCreateDrawer} className='max-sm:is-full'>
          Nuevo usuario
        </Button>
      </div>
      {error && (
        <Alert
          severity='error'
          className='mli-5 mbe-5'
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
        label='Usuarios'
        columns={columns}
        rows={data.rows}
        totalRows={data.totalRows}
        pagination={{ pageIndex: pagination.currentPage - 1, pageSize: pagination.pageSize }}
        onPaginationChange={({ pageIndex, pageSize }) =>
          setPagination((prev) => ({ ...prev, currentPage: pageSize === prev.pageSize ? pageIndex + 1 : 1, pageSize }))
        }
        pageSizeOptions={[8, 15, 25]}
        sorting={sorting}
        onSortingChange={(s) => setPagination((prev) => ({ ...prev, orderBy: s.id, orderByMode: s.desc ? 'desc' : 'asc', currentPage: 1 }))}
        isLoading={loading}
        emptyMessage='No hay usuarios que coincidan con los filtros.'
      />
      <AddEditUserDrawer open={drawerOpen} editUser={editUser} onClose={closeDrawer} onSuccess={handleSaved} />
      <ConfirmDialog
        open={!!deleteTarget}
        title='¿Eliminar usuario?'
        description={`Se eliminará a ${deleteTarget ? displayName(deleteTarget) : ''}. Esta acción no se puede deshacer.`}
        confirmLabel='Eliminar'
        destructive={false}
        onConfirm={() => void handleDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
    </Card>
  );
});
