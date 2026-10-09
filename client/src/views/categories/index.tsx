'use client';

import Grid from '@mui/material/Grid';
import Button from '@mui/material/Button';
import { PageHeader } from '@/components/shared/PageHeader';
import { useCategories } from './hooks/useCategories';
import { CategoriesTable } from './components/CategoriesTable';
import { notify } from '@/utils/notify';

export default function CategoriesView() {
  const controller = useCategories();

  const handleSuccess = () => {
    controller.refreshData();
    notify('Operación realizada exitosamente', 'success');
  };

  return (
    <Grid container spacing={3}>
      <Grid size={12}>
        <PageHeader
          title="Categorías"
          subtitle="Organiza las especialidades por categorías médicas"
        >
          <Button
            variant="contained"
            startIcon={<i className="ri-add-line" />}
            onClick={controller.openCreateDrawer}
          >
            Nueva Categoría
          </Button>
        </PageHeader>
        <CategoriesTable {...controller} refreshData={handleSuccess} />
      </Grid>
    </Grid>
  );
}
