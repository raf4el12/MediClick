'use client';

import Grid from '@mui/material/Grid';
import Collapse from '@mui/material/Collapse';
import { usePatients } from './hooks/usePatients';
import { PatientsTable } from './components/PatientsTable';
import { PatientDetailDialog } from './components/PatientDetailDialog';
import { useSnackbar } from '@/hooks/useSnackbar';
import { SuccessSnackbar } from '@/components/shared/SuccessSnackbar';

export default function PatientsView() {
  const controller = usePatients();
  const hasDetail = !!controller.detailPatient;
  const { snackbar, showSnackbar, closeSnackbar } = useSnackbar();

  const handleSuccess = () => {
    controller.refreshData();
    showSnackbar('Paciente registrado exitosamente', 'success');
  };

  return (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12, md: hasDetail ? 8 : 12 }} sx={{ transition: 'all 0.3s ease' }}>
        <PatientsTable {...controller} refreshData={handleSuccess} />
      </Grid>

      {hasDetail ? (
        <Grid size={{ xs: 12, md: 4 }}>
          <Collapse in={hasDetail} orientation="horizontal" unmountOnExit>
            <PatientDetailDialog
              patient={controller.detailPatient}
              onClose={controller.closeDetail}
            />
          </Collapse>
        </Grid>
      ) : null}

      <SuccessSnackbar snackbar={snackbar} onClose={closeSnackbar} />
    </Grid>
  );
}
