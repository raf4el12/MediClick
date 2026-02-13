'use client';

import Grid from '@mui/material/Grid';
import { useUsers } from './hooks/useUsers';
import { UsersTable } from './components/UsersTable';
import { UserDetailDialog } from './components/UserDetailDialog';

export default function UsersView() {
  const controller = useUsers();

  return (
    <Grid container spacing={3}>
      <Grid size={12}>
        <UsersTable {...controller} />
      </Grid>

      <UserDetailDialog
        user={controller.detailUser}
        onClose={controller.closeDetail}
      />
    </Grid>
  );
}
