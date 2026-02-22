'use client';

import { useMemo, useState } from 'react';
import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import TablePagination from '@mui/material/TablePagination';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableSortLabel from '@mui/material/TableSortLabel';
import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { SkeletonTable } from '@/components/shared/SkeletonTable';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import type { User } from '../types';
import type { PaginatedResponse } from '@/types/pagination.types';
import { UserFilters } from './UserFilters';
import { AddEditUserDrawer } from './AddEditUserDrawer';
import { useAppDispatch } from '@/redux-store/hooks';
import { deleteUserThunk } from '@/redux-store/thunks/users.thunks';

const columnHelper = createColumnHelper<User>();

const ROLE_LABELS: Record<string, { label: string; color: 'primary' | 'secondary' | 'success' | 'warning' | 'info' }> = {
  ADMIN: { label: 'Admin', color: 'primary' },
  DOCTOR: { label: 'Doctor', color: 'info' },
  RECEPTIONIST: { label: 'Recepcionista', color: 'secondary' },
  PATIENT: { label: 'Paciente', color: 'success' },
  USER: { label: 'Usuario', color: 'warning' },
};

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
  setPagination: React.Dispatch<React.SetStateAction<UsersTableProps['pagination']>>;
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

export function UsersTable({
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
    if (deleteUserThunk.fulfilled.match(result)) {
      refreshData();
    }
    setDeleteTarget(null);
  };

  const columns = useMemo(
    () => [
      columnHelper.display({
        id: 'fullName',
        header: 'Usuario',
        cell: ({ row }) => (
          <Box>
            <Typography color="text.primary" sx={{ fontWeight: 500 }}>
              {row.original.profile
                ? `${row.original.profile.name} ${row.original.profile.lastName}`
                : row.original.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {row.original.email}
            </Typography>
          </Box>
        ),
      }),
      columnHelper.accessor('role', {
        header: 'Rol',
        cell: ({ row }) => {
          const roleInfo = ROLE_LABELS[row.original.role] ?? {
            label: row.original.role,
            color: 'warning' as const,
          };
          return (
            <Chip
              label={roleInfo.label}
              color={roleInfo.color}
              size="small"
              variant="outlined"
            />
          );
        },
      }),
      columnHelper.display({
        id: 'phone',
        header: 'Teléfono',
        cell: ({ row }) => (
          <Typography>
            {row.original.profile?.phone ?? 'N/A'}
          </Typography>
        ),
        meta: { hiddenOnMobile: true },
      }),
      columnHelper.accessor('isActive', {
        header: 'Estado',
        cell: ({ row }) => (
          <Chip
            label={row.original.isActive ? 'Activo' : 'Inactivo'}
            color={row.original.isActive ? 'success' : 'error'}
            size="small"
          />
        ),
      }),
      columnHelper.display({
        id: 'actions',
        header: 'Acciones',
        cell: ({ row }) => (
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <IconButton
              size="small"
              color="primary"
              aria-label="Ver detalle de usuario"
              onClick={() => openDetail(row.original)}
            >
              <i className="ri-eye-line" style={{ fontSize: 18 }} />
            </IconButton>
            <IconButton
              size="small"
              color="info"
              aria-label="Editar usuario"
              onClick={() => openEditDrawer(row.original)}
            >
              <i className="ri-pencil-line" style={{ fontSize: 18 }} />
            </IconButton>
            <IconButton
              size="small"
              color="error"
              aria-label="Eliminar usuario"
              onClick={() => setDeleteTarget(row.original)}
            >
              <i className="ri-delete-bin-line" style={{ fontSize: 18 }} />
            </IconButton>
          </Box>
        ),
      }),
    ],
    [openDetail, openEditDrawer],
  );

  const table = useReactTable({
    data: data.rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: pagination.totalPages,
    state: {
      pagination: {
        pageIndex: pagination.currentPage - 1,
        pageSize: pagination.pageSize,
      },
    },
  });

  return (
    <>
      <Card>
        <Box sx={{ p: 3, pt: 4 }}>
          <UserFilters
            selectedRole={pagination.role}
            onRoleChange={handleRoleFilter}
            onSearch={debouncedSearch}
            onAddClick={openCreateDrawer}
          />

          {error && (
            <Alert
              severity="error"
              sx={{ mb: 2 }}
              action={
                <Button color="inherit" size="small" onClick={refreshData}>
                  Reintentar
                </Button>
              }
            >
              {error}
            </Alert>
          )}

          <TableContainer sx={{ overflowX: 'auto' }}>
            <Table sx={{ minWidth: 600 }}>
              <TableHead>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => {
                      const isHiddenOnMobile = (header.column.columnDef.meta as Record<string, boolean> | undefined)?.hiddenOnMobile;
                      return (
                        <TableCell
                          key={header.id}
                          sx={{
                            fontWeight: 600,
                            ...(isHiddenOnMobile && { display: { xs: 'none', sm: 'table-cell' } }),
                          }}
                        >
                          {header.isPlaceholder ? null : (
                            <TableSortLabel
                              active={pagination.orderBy === header.id}
                              direction={
                                pagination.orderBy === header.id
                                  ? pagination.orderByMode
                                  : 'asc'
                              }
                              onClick={() => {
                                if (header.id === 'actions') return;
                                setPagination((prev) => ({
                                  ...prev,
                                  orderBy: header.id,
                                  orderByMode:
                                    prev.orderBy === header.id &&
                                      prev.orderByMode === 'asc'
                                      ? 'desc'
                                      : 'asc',
                                  currentPage: 1,
                                }));
                              }}
                              hideSortIcon={header.id === 'actions'}
                            >
                              {flexRender(
                                header.column.columnDef.header,
                                header.getContext(),
                              )}
                            </TableSortLabel>
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableHead>
              <TableBody>
                {loading ? (
                  <SkeletonTable
                    rowsNum={pagination.pageSize}
                    colNum={columns.length}
                  />
                ) : table.getRowModel().rows.length > 0 ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id} hover>
                      {row.getVisibleCells().map((cell) => {
                        const isHiddenOnMobile = (cell.column.columnDef.meta as Record<string, boolean> | undefined)?.hiddenOnMobile;
                        return (
                          <TableCell
                            key={cell.id}
                            sx={isHiddenOnMobile ? { display: { xs: 'none', sm: 'table-cell' } } : undefined}
                          >
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext(),
                            )}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      sx={{ textAlign: 'center', py: 4 }}
                    >
                      <Typography color="text.secondary">
                        No hay usuarios disponibles
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            component="div"
            rowsPerPageOptions={[8, 15, 25]}
            count={data.totalRows}
            rowsPerPage={pagination.pageSize}
            page={pagination.currentPage - 1}
            labelRowsPerPage="Filas por página:"
            onPageChange={(_, page) =>
              setPagination((prev) => ({
                ...prev,
                currentPage: page + 1,
              }))
            }
            onRowsPerPageChange={(e) =>
              setPagination((prev) => ({
                ...prev,
                pageSize: Number(e.target.value),
                currentPage: 1,
              }))
            }
          />
        </Box>
      </Card>

      <AddEditUserDrawer
        open={drawerOpen}
        editUser={editUser}
        onClose={closeDrawer}
        onSuccess={refreshData}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Eliminar Usuario"
        description={`¿Estás seguro de eliminar a ${deleteTarget?.profile ? `${deleteTarget.profile.name} ${deleteTarget.profile.lastName}` : deleteTarget?.name}? Esta acción no se puede deshacer.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
