'use client';

import Grid from '@mui/material/Grid';
import { PageHeader } from '@/components/shared/PageHeader';
import { useCategories } from './hooks/useCategories';
import { CategoriesTable } from './components/CategoriesTable';
import { useSnackbar } from '@/hooks/useSnackbar';
import { SuccessSnackbar } from '@/components/shared/SuccessSnackbar';

export default function CategoriesView() {
  const controller = useCategories();
  const { snackbar, showSnackbar, closeSnackbar } = useSnackbar();

  const handleSuccess = () => {
    controller.refreshData();
    showSnackbar('Operación realizada exitosamente', 'success');
  };

  return (
    <Grid container spacing={3}>
      <Grid size={12}>
        <PageHeader title="Categorías" subtitle="Organiza las especialidades por categorías médicas" />
        <CategoriesTable {...controller} refreshData={handleSuccess} />
      </Grid>
      <SuccessSnackbar snackbar={snackbar} onClose={closeSnackbar} />
    </Grid>
  );
}
