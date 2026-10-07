'use client';

import { useCallback } from 'react';
import Grid from '@mui/material/Grid';
import { PageHeader } from '@/components/shared/PageHeader';
import { useClinics } from './hooks/useClinics';
import { ClinicsTable } from './components/ClinicsTable';
import { notify } from '@/utils/notify';

export default function ClinicsView() {
  const controller = useClinics();

  const handleSuccess = useCallback(() => {
    controller.refreshData();
    notify('Operación realizada exitosamente', 'success');
  }, [controller.refreshData]);

  return (
    <Grid container spacing={3}>
      <Grid size={12}>
        <PageHeader title="Clínicas" subtitle="Administra las sedes y sucursales" />
        <ClinicsTable {...controller} refreshData={handleSuccess} />
      </Grid>
    </Grid>
  );
}
