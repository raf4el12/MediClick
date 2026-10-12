'use client';

import dynamic from 'next/dynamic';
import Typography from '@mui/material/Typography';
import { UsersTable } from './components/UsersTable';
import { useUsers } from './hooks/useUsers';

const UserDetailDialog = dynamic(() => import('./components/UserDetailDialog').then((m) => m.UserDetailDialog));

/** Gestión de usuarios del personal: filtro por rol, búsqueda y tabla paginada en el servidor (UI-22). */
export default function UsersView() {
  const controller = useUsers();

  return (
    <div className='flex flex-col gap-6'>
      <div>
        <Typography variant='h4' component='h1'>
          Usuarios
        </Typography>
        <Typography color='text.secondary'>Las cuentas del personal y su acceso al sistema.</Typography>
      </div>
      <UsersTable {...controller} />
      <UserDetailDialog user={controller.detailUser} onClose={controller.closeDetail} />
    </div>
  );
}
