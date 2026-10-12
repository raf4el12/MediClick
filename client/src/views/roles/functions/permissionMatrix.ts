import { groupBySubject, subjectLabel } from '../permissionsMeta';
import type { PermissionDto } from '../types';

export interface MatrixCell {
  permissionId: number;
  checked: boolean;
}

export interface MatrixRow {
  subject: string;
  /** Celda por acción; `null` si el sujeto no tiene esa acción. */
  cells: Record<string, MatrixCell | null>;
}

export interface PermissionMatrix {
  /** Acciones presentes, en el orden de `permissionsMeta` (Gestionar primero). */
  actions: string[];
  rows: MatrixRow[];
}

/** Permisos y elegidos → matriz sujeto × acción (filas como el formulario actual: «Todos» primero, luego por nombre). */
export function toPermissionMatrix(permissions: PermissionDto[], selectedIds: number[]): PermissionMatrix {
  const selected = new Set(selectedIds);
  const groups = groupBySubject(permissions).sort((a, b) => {
    if (a.subject === 'ALL') return -1;
    if (b.subject === 'ALL') return 1;
    return subjectLabel(a.subject).localeCompare(subjectLabel(b.subject));
  });

  const actions: string[] = [];
  for (const g of groupBySubject(permissions)) for (const p of g.permissions) if (!actions.includes(p.action)) actions.push(p.action);

  return {
    actions,
    rows: groups.map((g) => ({
      subject: g.subject,
      cells: Object.fromEntries(
        actions.map((action) => {
          const p = g.permissions.find((x) => x.action === action);
          return [action, p ? { permissionId: p.id, checked: selected.has(p.id) } : null];
        }),
      ),
    })),
  };
}

const cellsOf = (row: MatrixRow) => Object.values(row.cells).filter((c): c is MatrixCell => c !== null);

const mapCells = (matrix: PermissionMatrix, fn: (cell: MatrixCell, row: MatrixRow) => boolean): PermissionMatrix => ({
  ...matrix,
  rows: matrix.rows.map((row) => ({
    ...row,
    cells: Object.fromEntries(Object.entries(row.cells).map(([action, c]) => [action, c ? { ...c, checked: fn(c, row) } : null])),
  })),
});

/** Casilla del módulo: si todas sus acciones están marcadas las quita; si no, las marca todas. */
export function toggleSubject(matrix: PermissionMatrix, subject: string): PermissionMatrix {
  const target = matrix.rows.find((r) => r.subject === subject);
  if (!target) return matrix;
  const allChecked = cellsOf(target).every((c) => c.checked);
  return mapCells(matrix, (c, row) => (row.subject === subject ? !allChecked : c.checked));
}

/** Una casilla. «Gestionar» no arrastra a las demás acciones: así lo hace el formulario actual. */
export function togglePermission(matrix: PermissionMatrix, permissionId: number): PermissionMatrix {
  return mapCells(matrix, (c) => (c.permissionId === permissionId ? !c.checked : c.checked));
}

/** «Seleccionar todo»: con todos marcados los quita; si falta alguno, los marca todos. */
export function toggleAll(matrix: PermissionMatrix): PermissionMatrix {
  const everyChecked = matrix.rows.every((row) => cellsOf(row).every((c) => c.checked));
  return mapCells(matrix, () => !everyChecked);
}

/** Estado de la casilla del módulo: todas marcadas, algunas (indeterminada) o ninguna. */
export function rowState(row: MatrixRow): { all: boolean; some: boolean } {
  const cells = cellsOf(row);
  const checked = cells.filter((c) => c.checked).length;
  return { all: cells.length > 0 && checked === cells.length, some: checked > 0 && checked < cells.length };
}

/** Matriz → ids marcados, para el payload de `POST/PATCH /roles`. */
export function fromPermissionMatrix(matrix: PermissionMatrix): number[] {
  return matrix.rows.flatMap((row) =>
    Object.values(row.cells)
      .filter((c): c is MatrixCell => c !== null && c.checked)
      .map((c) => c.permissionId),
  );
}
