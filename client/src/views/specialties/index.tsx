'use client';

import Grid from '@mui/material/Grid';
import Button from '@mui/material/Button';
import { PageHeader } from '@/components/shared/PageHeader';
import { useSpecialties } from './hooks/useSpecialties';
import { SpecialtiesTable } from './components/SpecialtiesTable';
import { useSnackbar } from '@/hooks/useSnackbar';
import { SuccessSnackbar } from '@/components/shared/SuccessSnackbar';

export default function SpecialtiesView() {
  const controller = useSpecialties();
  const { snackbar, showSnackbar, closeSnackbar } = useSnackbar();

  const handleSuccess = () => {
    controller.refreshData();
    showSnackbar('Operación realizada exitosamente', 'success');
  };

  return (
    <Grid container spacing={3}>
      <Grid size={12}>
        <PageHeader
          title="Especialidades"
          subtitle="Gestiona las especialidades médicas disponibles"
        >
          <Button
            variant="contained"
            startIcon={<i className="ri-add-line" />}
            onClick={controller.openCreateDrawer}
          >
            Nueva Especialidad
          </Button>
        </PageHeader>
        <SpecialtiesTable {...controller} refreshData={handleSuccess} />
      </Grid>
      <SuccessSnackbar snackbar={snackbar} onClose={closeSnackbar} />
    </Grid>
  );
}
