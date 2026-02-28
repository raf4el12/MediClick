'use client';

import Grid from '@mui/material/Grid';
import { useUsers } from './hooks/useUsers';
import { UsersTable } from './components/UsersTable';
import dynamic from 'next/dynamic';
import { useSnackbar } from '@/hooks/useSnackbar';
import { SuccessSnackbar } from '@/components/shared/SuccessSnackbar';

const UserDetailDialog = dynamic(
  () => import('./components/UserDetailDialog').then((m) => m.UserDetailDialog),
);

export default function UsersView() {
  const controller = useUsers();
  const { snackbar, showSnackbar, closeSnackbar } = useSnackbar();

  const handleSuccess = () => {
    controller.refreshData();
    showSnackbar('Operación realizada exitosamente', 'success');
  };

  return (
    <Grid container spacing={3}>
      <Grid size={12}>
        <UsersTable {...controller} refreshData={handleSuccess} />
      </Grid>

      <UserDetailDialog
        user={controller.detailUser}
        onClose={controller.closeDetail}
      />

      <SuccessSnackbar snackbar={snackbar} onClose={closeSnackbar} />
    </Grid>
  );
}
