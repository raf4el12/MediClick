// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from './DataTable';

interface Row {
  id: number;
  name: string;
}

const columns: ColumnDef<Row, unknown>[] = [
  { id: 'name', accessorKey: 'name', header: 'Nombre', enableSorting: true },
  { id: 'actions', header: 'Acciones', cell: () => 'acciones' },
];

const rows: Row[] = [
  { id: 1, name: 'Ana Torres' },
  { id: 2, name: 'Bruno Salazar' },
];

afterEach(cleanup);

describe('DataTable', () => {
  it('cambiar de página informa el índice nuevo', () => {
    const onPaginationChange = vi.fn();
    render(
      <DataTable
        label='Pacientes'
        columns={columns}
        rows={rows}
        totalRows={25}
        pagination={{ pageIndex: 0, pageSize: 10 }}
        onPaginationChange={onPaginationChange}
        emptyMessage='No hay pacientes'
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /página siguiente/i }));

    expect(onPaginationChange).toHaveBeenCalledWith({ pageIndex: 1, pageSize: 10 });
  });

  it('mientras carga muestra filas de esqueleto, no las filas, y marca la tabla como ocupada', () => {
    render(
      <DataTable
        label='Pacientes'
        columns={columns}
        rows={rows}
        totalRows={2}
        pagination={{ pageIndex: 0, pageSize: 10 }}
        onPaginationChange={() => {}}
        emptyMessage='No hay pacientes'
        isLoading
      />,
    );

    const table = screen.getByRole('table', { name: 'Pacientes' });
    expect(table.getAttribute('aria-busy')).toBe('true');
    expect(within(table).queryByText('Ana Torres')).toBeNull();
    expect(table.querySelectorAll('tbody .MuiSkeleton-root').length).toBeGreaterThan(0);
  });

  it('sin filas muestra el mensaje vacío en una sola celda', () => {
    render(
      <DataTable label='Pacientes' columns={columns} rows={[]} totalRows={0} pagination={{ pageIndex: 0, pageSize: 10 }} onPaginationChange={() => {}} emptyMessage='No hay pacientes' />,
    );

    const cell = screen.getByText('No hay pacientes').closest('td')!;
    expect(cell.getAttribute('colspan')).toBe('2');
  });

  it('ordenar una columna ordenable marca aria-sort e informa el orden; las demás no se ordenan', () => {
    const onSortingChange = vi.fn();
    const { rerender } = render(
      <DataTable
        label='Pacientes'
        columns={columns}
        rows={rows}
        totalRows={2}
        pagination={{ pageIndex: 0, pageSize: 10 }}
        onPaginationChange={() => {}}
        emptyMessage='No hay pacientes'
        sorting={null}
        onSortingChange={onSortingChange}
      />,
    );

    const name = screen.getByRole('columnheader', { name: /Nombre/ });
    expect(name.getAttribute('aria-sort')).toBe('none');
    expect(screen.getByRole('columnheader', { name: 'Acciones' }).hasAttribute('aria-sort')).toBe(false);

    fireEvent.click(within(name).getByRole('button'));
    expect(onSortingChange).toHaveBeenCalledWith({ id: 'name', desc: false });

    rerender(
      <DataTable
        label='Pacientes'
        columns={columns}
        rows={rows}
        totalRows={2}
        pagination={{ pageIndex: 0, pageSize: 10 }}
        onPaginationChange={() => {}}
        emptyMessage='No hay pacientes'
        sorting={{ id: 'name', desc: false }}
        onSortingChange={onSortingChange}
      />,
    );
    expect(screen.getByRole('columnheader', { name: /Nombre/ }).getAttribute('aria-sort')).toBe('ascending');
    fireEvent.click(within(screen.getByRole('columnheader', { name: /Nombre/ })).getByRole('button'));
    expect(onSortingChange).toHaveBeenLastCalledWith({ id: 'name', desc: true });
  });

  it('sin paginación muestra todas las filas y ningún paginador', () => {
    render(<DataTable label='Lista de espera' columns={columns} rows={rows} emptyMessage='Nadie espera' />);

    expect(screen.getByText('Ana Torres')).toBeTruthy();
    expect(screen.getByText('Bruno Salazar')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /página siguiente/i })).toBeNull();
  });
});
