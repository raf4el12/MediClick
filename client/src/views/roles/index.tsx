'use client';

import { useState } from 'react';
import Grid from '@mui/material/Grid';
import { useRoles } from './hooks/useRoles';
import { RolesTable } from './components/RolesTable';
import { RoleFormDrawer } from './components/RoleFormDrawer';
import { PermissionsDialog } from './components/PermissionsDialog';
import { useSnackbar } from '@/hooks/useSnackbar';
import { SuccessSnackbar } from '@/components/shared/SuccessSnackbar';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import type { RoleDto } from './types';

export default function RolesView() {
  const controller = useRoles();
  const { snackbar, showSnackbar, closeSnackbar } = useSnackbar();
  const [viewRole, setViewRole] = useState<RoleDto | null>(null);

  const handleSuccess = () => {
    controller.refreshData();
    showSnackbar('Operación realizada exitosamente', 'success');
  };

  const handleDelete = async () => {
    await controller.handleDelete();
    showSnackbar('Rol eliminado exitosamente', 'success');
  };

  return (
    <Grid container spacing={3}>
      <Grid size={12}>
        <RolesTable
          roles={controller.roles}
          loading={controller.loading}
          error={controller.error}
          onAdd={controller.openCreateDrawer}
          onEdit={controller.openEditDrawer}
          onDelete={controller.setDeleteTarget}
          onRefresh={controller.refreshData}
          onViewPermissions={setViewRole}
        />
      </Grid>

      <RoleFormDrawer
        open={controller.drawerOpen}
        editRole={controller.editRole}
        permissions={controller.permissions}
        onClose={controller.closeDrawer}
        onSuccess={handleSuccess}
      />

      <PermissionsDialog
        role={viewRole}
        onClose={() => setViewRole(null)}
      />

      <ConfirmDialog
        open={!!controller.deleteTarget}
        title="Eliminar Rol"
        description={`¿Estás seguro de eliminar el rol "${controller.deleteTarget?.name}"? Los usuarios asignados a este rol perderán sus permisos.`}
        onConfirm={handleDelete}
        onCancel={() => controller.setDeleteTarget(null)}
      />

      <SuccessSnackbar snackbar={snackbar} onClose={closeSnackbar} />
    </Grid>
  );
}
