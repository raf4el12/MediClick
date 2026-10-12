'use client';

import { memo, useCallback, useMemo } from 'react';
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
import { DataTable } from '@/components/shared/DataTable';
import type { DataTableSorting } from '@/components/shared/DataTable/DataTable';
import { DebouncedInput } from '@/components/shared/DebouncedInput';
import type { PaginatedResponse } from '@/types/pagination.types';
import type { Clinic } from '@/views/clinics/types';
import type { Specialty } from '@/views/specialties/types';
import type { Doctor } from '../types';
import { AddDoctorDrawer } from './AddDoctorDrawer';
import { DoctorFilters } from './DoctorFilters';

const columnHelper = createColumnHelper<Doctor>();

/** Columnas que el servidor sabe ordenar: campos propios de `Doctors`. */
const SORTABLE = ['licenseNumber', 'isActive'];

interface DoctorsTableProps {
  data: PaginatedResponse<Doctor>;
  specialties: Specialty[];
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
    specialtyId?: number;
  };
  setPagination: React.Dispatch<React.SetStateAction<DoctorsTableProps['pagination']>>;
  debouncedSearch: (value: string) => void;
  handleSpecialtyFilter: (specialtyId: number | undefined) => void;
  drawerOpen: boolean;
  openCreateDrawer: () => void;
  closeDrawer: () => void;
  openDetail: (doctor: Doctor) => void;
  onEdit: (doctor: Doctor) => void;
  onDelete: (doctor: Doctor) => void;
  refreshData: () => void;
  onCreated: () => void;
}

const fullName = (d: Doctor) => `${d.profile.name} ${d.profile.lastName}`;

/** Lista de médicos con el patrón `user/list` de Materio sobre `DataTable`. */
export const DoctorsTable = memo(function DoctorsTable({
  data,
  specialties,
  clinics,
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
  onEdit,
  onDelete,
  refreshData,
  onCreated,
}: DoctorsTableProps) {
  const columns = useMemo(
    () => [
      columnHelper.display({
        id: 'fullName',
        header: 'Médico',
        cell: ({ row }) => (
          <div className='flex flex-col'>
            <Typography color='text.primary' className='font-medium'>
              {fullName(row.original)}
            </Typography>
            <Typography variant='body2'>{row.original.profile.email}</Typography>
          </div>
        ),
      }),
      columnHelper.accessor('licenseNumber', {
        header: 'CMP',
        enableSorting: true,
        meta: { hiddenOnMobile: true },
        cell: ({ getValue }) => <Typography>{getValue()}</Typography>,
      }),
      columnHelper.display({
        id: 'specialties',
        header: 'Especialidades',
        cell: ({ row }) => (
          <div className='flex flex-wrap gap-1'>
            {row.original.specialties.map((spec) => (
              <Chip key={spec.id} label={spec.name} size='small' variant='tonal' color='primary' />
            ))}
          </div>
        ),
      }),
      columnHelper.display({
        id: 'clinic',
        header: 'Sede',
        meta: { hiddenOnMobile: true },
        cell: ({ row }) => <Typography>{row.original.clinic?.name ?? 'Sin asignar'}</Typography>,
      }),
      columnHelper.display({
        id: 'phone',
        header: 'Teléfono',
        meta: { hiddenOnMobile: true },
        cell: ({ row }) => <Typography>{row.original.profile.phone ?? '—'}</Typography>,
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
            <IconButton aria-label={`Editar a ${fullName(row.original)}`} onClick={() => onEdit(row.original)}>
              <i className='ri-pencil-line text-textSecondary' aria-hidden />
            </IconButton>
            <OptionMenu
              iconButtonProps={{ 'aria-label': `Más acciones para ${fullName(row.original)}` }}
              iconClassName='text-textSecondary'
              options={[
                { text: 'Ver detalle', icon: 'ri-eye-line', menuItemProps: { className: 'flex items-center gap-2', onClick: () => openDetail(row.original) } },
                { text: 'Eliminar', icon: 'ri-delete-bin-7-line', menuItemProps: { className: 'flex items-center gap-2', onClick: () => onDelete(row.original) } },
              ]}
            />
          </div>
        ),
      }),
    ],
    [openDetail, onEdit, onDelete],
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
        <DoctorFilters specialties={specialties} selectedSpecialty={pagination.specialtyId} onSpecialtyChange={handleSpecialtyFilter} />
      </CardContent>
      <Divider />
      <div className='flex flex-col items-start justify-between gap-4 p-5 sm:flex-row sm:items-center'>
        <DebouncedInput
          placeholder='Buscar médico'
          value={pagination.searchValue}
          onChange={handleSearch}
          className='max-sm:is-full'
          slotProps={{ htmlInput: { 'aria-label': 'Buscar médico' } }}
        />
        <Button variant='contained' startIcon={<i className='ri-add-line' aria-hidden />} onClick={openCreateDrawer} className='max-sm:is-full'>
          Nuevo médico
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
        label='Médicos'
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
        emptyMessage='No hay médicos que coincidan con los filtros.'
      />
      <AddDoctorDrawer open={drawerOpen} specialties={specialties} clinics={clinics} onClose={closeDrawer} onSuccess={onCreated} />
    </Card>
  );
});
