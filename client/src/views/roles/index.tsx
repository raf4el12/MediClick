'use client';

import { useState } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { notify } from '@/utils/notify';
import { useRoles } from './hooks/useRoles';
import { RoleCards } from './components/RoleCards';
import { RoleDialog } from './components/RoleDialog';
import { RolesTable } from './components/RolesTable';
import type { RoleDto } from './types';

/** Roles y permisos (patrón `views/apps/roles` de Materio): tarjetas por rol, listado y diálogo con la matriz. */
export default function RolesView() {
  const controller = useRoles();
  // `undefined`: cerrado; `null`: rol nuevo.
  const [dialogRole, setDialogRole] = useState<RoleDto | null | undefined>(undefined);

  const handleDelete = async () => {
    const ok = await controller.handleDelete();
    if (ok) notify('Rol eliminado');
  };

  return (
    <div className='flex flex-col gap-6'>
      <div>
        <Typography variant='h4' component='h1' className='mbe-1'>
          Roles y permisos
        </Typography>
        <Typography>Cada rol define qué puede ver y hacer su equipo en cada módulo de MediClick.</Typography>
      </div>
      {controller.error && (
        <Alert
          severity='error'
          action={
            <Button color='inherit' size='small' onClick={() => void controller.refreshData()}>
              Reintentar
            </Button>
          }
        >
          {controller.error}
        </Alert>
      )}
      <RoleCards roles={controller.roles} loading={controller.loading} onOpen={setDialogRole} onAdd={() => setDialogRole(null)} />
      <div>
        <Typography variant='h4' component='h2' className='mbe-1'>
          Todos los roles
        </Typography>
        <Typography>Los roles de sistema vienen con MediClick y no se pueden modificar ni eliminar.</Typography>
      </div>
      <Card>
        <RolesTable roles={controller.roles} loading={controller.loading} onDelete={controller.setDeleteTarget} />
      </Card>

      {dialogRole !== undefined && (
        <RoleDialog
          key={dialogRole?.id ?? 'nuevo'}
          role={dialogRole}
          permissions={controller.permissions}
          onClose={() => setDialogRole(undefined)}
          onSaved={(created) => {
            setDialogRole(undefined);
            notify(created ? 'Rol creado' : 'Rol actualizado');
            void controller.refreshData();
          }}
        />
      )}

      <ConfirmDialog
        open={!!controller.deleteTarget}
        title='Eliminar el rol'
        description={`Los usuarios con el rol «${controller.deleteTarget?.name ?? ''}» perderán sus permisos.`}
        destructive={false}
        onConfirm={() => void handleDelete()}
        onCancel={() => controller.setDeleteTarget(null)}
      />
    </div>
  );
}
