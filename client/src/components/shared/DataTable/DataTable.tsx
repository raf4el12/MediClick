'use client';

import type { ReactNode } from 'react';
import { flexRender, getCoreRowModel, useReactTable, type ColumnDef, type ColumnMeta, type RowData } from '@tanstack/react-table';
import Skeleton from '@mui/material/Skeleton';
import TablePagination from '@mui/material/TablePagination';
import TableSortLabel from '@mui/material/TableSortLabel';
import tableStyles from '@core/styles/table.module.css';

declare module '@tanstack/react-table' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    align?: 'left' | 'center' | 'right';
    /** La columna se oculta en pantallas angostas. */
    hiddenOnMobile?: boolean;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const cellProps = (meta: ColumnMeta<any, unknown> | undefined) => ({
  align: meta?.align,
  className: meta?.hiddenOnMobile ? 'max-sm:hidden' : undefined,
});

export interface DataTablePagination {
  /** Página actual, desde 0. */
  pageIndex: number;
  pageSize: number;
}

export interface DataTableSorting {
  id: string;
  desc: boolean;
}

interface ServerPaging {
  totalRows: number;
  pagination: DataTablePagination;
  onPaginationChange: (pagination: DataTablePagination) => void;
  pageSizeOptions?: number[];
}

/** Lista completa: todas las filas en una página, sin paginador. */
interface FullList {
  totalRows?: undefined;
  pagination?: undefined;
  onPaginationChange?: undefined;
  pageSizeOptions?: undefined;
}

export type DataTableProps<T> = (ServerPaging | FullList) & {
  /** Nombre accesible de la tabla. */
  label: string;
  // `any` en el valor de celda: es lo que espera useReactTable para columnas de tipos mezclados.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  columns: ColumnDef<T, any>[];
  rows: T[];
  emptyMessage: ReactNode;
  isLoading?: boolean;
  /** Orden del servidor; solo las columnas con `enableSorting: true` se pueden ordenar. */
  sorting?: DataTableSorting | null;
  onSortingChange?: (sorting: DataTableSorting) => void;
};

const ARIA: Record<'first' | 'last' | 'next' | 'previous', string> = {
  first: 'Ir a la primera página',
  last: 'Ir a la última página',
  next: 'Ir a la página siguiente',
  previous: 'Ir a la página anterior',
};

/**
 * Tabla de gestión con paginación de servidor (patrón `user/list` de Materio): las filas que llegan
 * son la página actual y la tabla solo informa los cambios de página.
 */
export function DataTable<T>(props: DataTableProps<T>) {
  const { label, columns, rows, emptyMessage, isLoading = false, sorting = null, onSortingChange } = props;
  const pagination = props.pagination ?? { pageIndex: 0, pageSize: Math.max(rows.length, 1) };
  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    rowCount: props.totalRows ?? rows.length,
    state: { pagination },
  });

  return (
    <div>
      <div className='overflow-x-auto'>
        <table className={tableStyles.table} aria-label={label} aria-busy={isLoading}>
          <thead>
            {table.getHeaderGroups().map((group) => (
              <tr key={group.id}>
                {group.headers.map((header) => {
                  const content = header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext());
                  if (header.column.columnDef.enableSorting !== true || !onSortingChange) {
                    return (
                      <th key={header.id} scope='col' {...cellProps(header.column.columnDef.meta)}>
                        {content}
                      </th>
                    );
                  }
                  const active = sorting?.id === header.column.id;
                  return (
                    <th key={header.id} scope='col' {...cellProps(header.column.columnDef.meta)} aria-sort={active ? (sorting!.desc ? 'descending' : 'ascending') : 'none'}>
                      <TableSortLabel
                        active={active}
                        direction={active && sorting!.desc ? 'desc' : 'asc'}
                        onClick={() => onSortingChange({ id: header.column.id, desc: active ? !sorting!.desc : false })}
                      >
                        {content}
                      </TableSortLabel>
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: Math.min(pagination.pageSize, 8) }, (_, i) => (
                <tr key={`cargando-${i}`}>
                  {columns.map((_, j) => (
                    <td key={j}>
                      <Skeleton variant='text' />
                    </td>
                  ))}
                </tr>
              ))
            ) : table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className='text-center'>
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} {...cellProps(cell.column.columnDef.meta)}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {props.pagination && (
        <TablePagination
          component='div'
          count={props.totalRows}
          page={props.pagination.pageIndex}
          rowsPerPage={props.pagination.pageSize}
          rowsPerPageOptions={props.pageSizeOptions ?? [10, 25, 50]}
          labelRowsPerPage='Filas por página:'
          labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count}`}
          getItemAriaLabel={(type) => ARIA[type]}
          onPageChange={(_, page) => props.onPaginationChange({ pageIndex: page, pageSize: props.pagination!.pageSize })}
          onRowsPerPageChange={(e) => props.onPaginationChange({ pageIndex: 0, pageSize: Number(e.target.value) })}
        />
      )}
    </div>
  );
}
