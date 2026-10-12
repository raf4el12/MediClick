'use client';

import { useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import { DataTable } from '@/components/shared/DataTable';
import type { RoleDto } from '../types';
import { permissionSummary } from './RoleCards';

interface RolesTableProps {
  roles: RoleDto[];
  loading: boolean;
  onDelete: (role: RoleDto) => void;
}

/** Listado de roles sobre `DataTable` (lista completa: `GET /roles` no pagina). */
export function RolesTable({ roles, loading, onDelete }: RolesTableProps) {
  const columns = useMemo<ColumnDef<RoleDto, unknown>[]>(
    () => [
      {
        id: 'name',
        header: 'Rol',
        cell: ({ row }) => (
          <div className='flex flex-col'>
            <Typography className='font-medium' color='text.primary'>
              {row.original.name}
            </Typography>
            {row.original.description && <Typography variant='body2'>{row.original.description}</Typography>}
          </div>
        ),
      },
      {
        id: 'type',
        header: 'Tipo',
        cell: ({ row }) => (
          <Chip size='small' variant='tonal' color={row.original.isSystem ? 'info' : 'primary'} label={row.original.isSystem ? 'Sistema' : 'Personalizado'} />
        ),
      },
      {
        id: 'permissions',
        header: 'Permisos',
        meta: { hiddenOnMobile: true },
        cell: ({ row }) => <Typography>{permissionSummary(row.original)}</Typography>,
      },
      {
        id: 'actions',
        header: 'Acciones',
        meta: { align: 'center' },
        cell: ({ row }) =>
          row.original.isSystem ? (
            <Typography variant='body2'>No se puede eliminar</Typography>
          ) : (
            <IconButton aria-label={`Eliminar el rol ${row.original.name}`} onClick={() => onDelete(row.original)}>
              <i className='ri-delete-bin-7-line' aria-hidden />
            </IconButton>
          ),
      },
    ],
    [onDelete],
  );

  return <DataTable label='Roles' columns={columns} rows={roles} isLoading={loading} emptyMessage='No hay roles. Agrega el primero desde «Agregar rol».' />;
}
