'use client';

import { useCallback } from 'react';
import Grid from '@mui/material/Grid';
import { useClinics } from './hooks/useClinics';
import { ClinicsTable } from './components/ClinicsTable';
import { useSnackbar } from '@/hooks/useSnackbar';
import { SuccessSnackbar } from '@/components/shared/SuccessSnackbar';

export default function ClinicsView() {
  const controller = useClinics();
  const { snackbar, showSnackbar, closeSnackbar } = useSnackbar();

  const handleSuccess = useCallback(() => {
    controller.refreshData();
    showSnackbar('Operación realizada exitosamente', 'success');
  }, [controller.refreshData, showSnackbar]);

  return (
    <Grid container spacing={3}>
      <Grid size={12}>
        <ClinicsTable {...controller} refreshData={handleSuccess} />
      </Grid>
      <SuccessSnackbar snackbar={snackbar} onClose={closeSnackbar} />
    </Grid>
  );
}
