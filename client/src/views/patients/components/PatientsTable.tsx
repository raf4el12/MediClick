'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { ColumnDef } from '@tanstack/react-table';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import CustomAvatar from '@core/components/mui/Avatar';
import { DataTable, type DataTablePagination, type DataTableSorting } from '@/components/shared/DataTable';
import { formatDate } from '@/utils/formatDate';
import { getInitials } from '@/utils/getInitials';
import type { Patient } from '../types';

const SORTABLE = ['bloodType', 'createdAt', 'isActive'];

const ageFrom = (birthday: string | null, now: number) =>
  birthday ? `${Math.floor((now - new Date(birthday).getTime()) / (365.25 * 24 * 60 * 60 * 1000))} años` : '—';

interface PatientsTableProps {
  rows: Patient[];
  totalRows: number;
  loading: boolean;
  pagination: { currentPage: number; pageSize: number; orderBy: string; orderByMode: 'asc' | 'desc' };
  onPaginationChange: (page: DataTablePagination) => void;
  onSortingChange: (sorting: DataTableSorting) => void;
  onEdit: (patient: Patient) => void;
  onDelete: (patient: Patient) => void;
}

/** Columnas de pacientes sobre `DataTable`; solo se ordena por campos reales del paciente. */
export function PatientsTable({ rows, totalRows, loading, pagination, onPaginationChange, onSortingChange, onEdit, onDelete }: PatientsTableProps) {
  const [now] = useState(() => Date.now());

  const columns = useMemo<ColumnDef<Patient>[]>(
    () => [
      {
        id: 'patient',
        header: 'Paciente',
        cell: ({ row: { original: p } }) => {
          const fullName = `${p.profile.name} ${p.profile.lastName}`;
          return (
            <div className='flex items-center gap-3'>
              <CustomAvatar skin='light' color='primary' size={34}>
                {getInitials(fullName)}
              </CustomAvatar>
              <div className='flex flex-col'>
                <Typography color='text.primary' className='font-medium'>
                  {fullName}
                </Typography>
                <Typography variant='body2'>{p.profile.email}</Typography>
              </div>
            </div>
          );
        },
      },
      {
        id: 'document',
        header: 'Documento',
        meta: { hiddenOnMobile: true },
        cell: ({ row: { original: p } }) => (p.profile.numberDocument ? `${p.profile.typeDocument ?? ''} ${p.profile.numberDocument}`.trim() : '—'),
      },
      { id: 'phone', header: 'Teléfono', meta: { hiddenOnMobile: true }, cell: ({ row }) => row.original.profile.phone ?? '—' },
      { id: 'age', header: 'Edad', meta: { hiddenOnMobile: true }, cell: ({ row }) => ageFrom(row.original.profile.birthday, now) },
      {
        id: 'bloodType',
        header: 'Sangre',
        enableSorting: true,
        cell: ({ row }) => <Chip size='small' variant='outlined' label={row.original.bloodType} />,
      },
      { id: 'createdAt', header: 'Registro', enableSorting: true, meta: { hiddenOnMobile: true }, cell: ({ row }) => formatDate(row.original.createdAt) },
      {
        id: 'isActive',
        header: 'Estado',
        enableSorting: true,
        cell: ({ row }) => (
          <Chip size='small' variant='tonal' color={row.original.isActive ? 'success' : 'secondary'} label={row.original.isActive ? 'Activo' : 'Inactivo'} />
        ),
      },
      {
        id: 'actions',
        header: 'Acciones',
        cell: ({ row: { original: p } }) => {
          const fullName = `${p.profile.name} ${p.profile.lastName}`;
          return (
            <div className='flex items-center'>
              <Tooltip title='Ver expediente'>
                <IconButton component={Link} href={`/patients/${p.id}`} aria-label={`Ver expediente de ${fullName}`}>
                  <i className='ri-file-user-line text-textSecondary' aria-hidden />
                </IconButton>
              </Tooltip>
              <Tooltip title='Editar'>
                <IconButton onClick={() => onEdit(p)} aria-label={`Editar a ${fullName}`}>
                  <i className='ri-edit-box-line text-textSecondary' aria-hidden />
                </IconButton>
              </Tooltip>
              <Tooltip title='Eliminar'>
                <IconButton onClick={() => onDelete(p)} aria-label={`Eliminar a ${fullName}`}>
                  <i className='ri-delete-bin-7-line text-textSecondary' aria-hidden />
                </IconButton>
              </Tooltip>
            </div>
          );
        },
      },
    ],
    [now, onEdit, onDelete],
  );

  return (
    <DataTable
      label='Pacientes'
      columns={columns}
      rows={rows}
      totalRows={totalRows}
      isLoading={loading}
      pagination={{ pageIndex: pagination.currentPage - 1, pageSize: pagination.pageSize }}
      onPaginationChange={onPaginationChange}
      pageSizeOptions={[8, 15, 25]}
      sorting={SORTABLE.includes(pagination.orderBy) ? { id: pagination.orderBy, desc: pagination.orderByMode === 'desc' } : null}
      onSortingChange={onSortingChange}
      emptyMessage='No hay pacientes que coincidan con la búsqueda.'
    />
  );
}
