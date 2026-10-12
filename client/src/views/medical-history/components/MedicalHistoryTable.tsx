'use client';

import { useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import { DataTable } from '@/components/shared/DataTable';
import { HISTORY_STATUS, HISTORY_STATUSES, diagnosedLabel } from '../status';
import type { MedicalHistory, MedicalHistoryStatus } from '../types';

interface MedicalHistoryTableProps {
  entries: MedicalHistory[];
  total: number;
  loading: boolean;
  page: number;
  limit: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  onDetail: (entry: MedicalHistory) => void;
  onEdit: (entry: MedicalHistory) => void;
  onStatusChange: (entry: MedicalHistory, status: MedicalHistoryStatus) => void;
  onDelete: (entry: MedicalHistory) => void;
}

/** Antecedentes del paciente sobre `DataTable`, con detalle, edición, cambio de estado y baja. */
export function MedicalHistoryTable({
  entries,
  total,
  loading,
  page,
  limit,
  onPageChange,
  onLimitChange,
  onDetail,
  onEdit,
  onStatusChange,
  onDelete,
}: MedicalHistoryTableProps) {
  const [statusMenu, setStatusMenu] = useState<{ anchor: HTMLElement; entry: MedicalHistory } | null>(null);

  const columns = useMemo<ColumnDef<MedicalHistory, unknown>[]>(
    () => [
      {
        id: 'condition',
        header: 'Condición',
        cell: ({ row }) => (
          <div className='flex flex-col max-is-[320px] whitespace-normal'>
            <Typography color='text.primary' className='font-medium'>
              {row.original.condition}
            </Typography>
            <Typography variant='body2' color='text.secondary' className='line-clamp-1'>
              {row.original.description || 'Sin descripción'}
            </Typography>
          </div>
        ),
      },
      {
        id: 'diagnosedDate',
        header: 'Diagnóstico',
        meta: { hiddenOnMobile: true },
        cell: ({ row }) => diagnosedLabel(row.original.diagnosedDate),
      },
      {
        id: 'status',
        header: 'Estado',
        cell: ({ row }) => {
          const meta = HISTORY_STATUS[row.original.status];
          return <Chip size='small' variant='tonal' color={meta.color} label={meta.label} />;
        },
      },
      {
        id: 'actions',
        // En un elemento: la regla `[align='right'] > *` de Materio alinea hijos, no texto suelto.
        header: () => <div>Acciones</div>,
        meta: { align: 'right' },
        cell: ({ row }) => {
          const entry = row.original;
          return (
            <div className='flex justify-end'>
              <IconButton size='small' aria-label={`Ver detalle de ${entry.condition}`} onClick={() => onDetail(entry)}>
                <i className='ri-eye-line' aria-hidden />
              </IconButton>
              <IconButton size='small' aria-label={`Editar ${entry.condition}`} onClick={() => onEdit(entry)}>
                <i className='ri-pencil-line' aria-hidden />
              </IconButton>
              <IconButton
                size='small'
                aria-label={`Cambiar estado de ${entry.condition}`}
                aria-haspopup='menu'
                onClick={(e) => setStatusMenu({ anchor: e.currentTarget, entry })}
              >
                <i className='ri-loop-left-line' aria-hidden />
              </IconButton>
              <IconButton size='small' aria-label={`Eliminar ${entry.condition}`} onClick={() => onDelete(entry)}>
                <i className='ri-delete-bin-line' aria-hidden />
              </IconButton>
            </div>
          );
        },
      },
    ],
    [onDetail, onEdit, onDelete],
  );

  return (
    <>
      <DataTable
        label='Historial médico'
        columns={columns}
        rows={entries}
        totalRows={total}
        isLoading={loading}
        pagination={{ pageIndex: page - 1, pageSize: limit }}
        pageSizeOptions={[12, 24, 48]}
        onPaginationChange={({ pageIndex, pageSize }) => (pageSize !== limit ? onLimitChange(pageSize) : onPageChange(pageIndex + 1))}
        emptyMessage='Este paciente no tiene antecedentes registrados.'
      />
      <Menu anchorEl={statusMenu?.anchor ?? null} open={!!statusMenu} onClose={() => setStatusMenu(null)}>
        {HISTORY_STATUSES.map((status) => (
          <MenuItem
            key={status}
            disabled={statusMenu?.entry.status === status}
            onClick={() => {
              if (statusMenu) onStatusChange(statusMenu.entry, status);
              setStatusMenu(null);
            }}
          >
            {HISTORY_STATUS[status].label}
            {statusMenu?.entry.status === status ? ' (actual)' : ''}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
