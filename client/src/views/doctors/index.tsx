'use client';

import Grid from '@mui/material/Grid';
import { useDoctors } from './hooks/useDoctors';
import { DoctorsTable } from './components/DoctorsTable';
import { DoctorDetailDialog } from './components/DoctorDetailDialog';
import { useSnackbar } from '@/hooks/useSnackbar';
import { SuccessSnackbar } from '@/components/shared/SuccessSnackbar';

export default function DoctorsView() {
  const controller = useDoctors();
  const { snackbar, showSnackbar, closeSnackbar } = useSnackbar();

  const handleSuccess = () => {
    controller.refreshData();
    showSnackbar('Doctor registrado exitosamente', 'success');
  };

  return (
    <Grid container spacing={3}>
      <Grid size={12}>
        <DoctorsTable {...controller} refreshData={handleSuccess} />
      </Grid>

      <DoctorDetailDialog
        doctor={controller.detailDoctor}
        onClose={controller.closeDetail}
      />

      <SuccessSnackbar snackbar={snackbar} onClose={closeSnackbar} />
    </Grid>
  );
}
