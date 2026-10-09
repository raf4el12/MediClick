'use client';

import Grid from '@mui/material/Grid';
import Button from '@mui/material/Button';
import { PageHeader } from '@/components/shared/PageHeader';
import { useSpecialties } from './hooks/useSpecialties';
import { SpecialtiesTable } from './components/SpecialtiesTable';
import { notify } from '@/utils/notify';

export default function SpecialtiesView() {
  const controller = useSpecialties();

  const handleSuccess = () => {
    controller.refreshData();
    notify('Operación realizada exitosamente', 'success');
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
    </Grid>
  );
}
