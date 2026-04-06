'use client';

import dynamic from 'next/dynamic';
import Grid from '@mui/material/Grid';
import Collapse from '@mui/material/Collapse';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import { PageHeader } from '@/components/shared/PageHeader';
import { useAppointments } from './hooks/useAppointments';
import { AppointmentsTable } from './components/AppointmentsTable';
import { useSnackbar } from '@/hooks/useSnackbar';
import { SuccessSnackbar } from '@/components/shared/SuccessSnackbar';

const DynamicLoading = () => (
  <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
    <CircularProgress size={28} />
  </Box>
);

const AppointmentDetailDialog = dynamic(
  () => import('./components/AppointmentDetailDialog').then((m) => m.AppointmentDetailDialog),
  { loading: DynamicLoading },
);
const CreateAppointmentDialog = dynamic(
  () => import('./components/CreateAppointmentDialog').then((m) => m.CreateAppointmentDialog),
  { loading: DynamicLoading },
);
const CancelAppointmentDialog = dynamic(
  () => import('./components/CancelAppointmentDialog').then((m) => m.CancelAppointmentDialog),
  { loading: DynamicLoading },
);
const RescheduleAppointmentDialog = dynamic(
  () => import('./components/RescheduleAppointmentDialog').then((m) => m.RescheduleAppointmentDialog),
  { loading: DynamicLoading },
);

export default function AppointmentsView() {
  const controller = useAppointments();
  const hasDetail = !!controller.detailAppointment;
  const { snackbar, showSnackbar, closeSnackbar } = useSnackbar();

  const handleRefreshWithToast = () => {
    controller.refreshData();
    showSnackbar('Operación realizada exitosamente', 'success');
  };

  return (
    <>
      <PageHeader title="Citas" subtitle="Administra y gestiona todas las citas médicas" />
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: hasDetail ? 8 : 12 }} sx={{ transition: 'all 0.3s ease' }}>
          <AppointmentsTable
            data={controller.data}
            loading={controller.loading}
            error={controller.error}
            pagination={controller.pagination}
            filters={controller.filters}
            setPagination={controller.setPagination}
            debouncedSearch={controller.debouncedSearch}
            updateFilters={controller.updateFilters}
            openCreateDialog={controller.openCreateDialog}
            openDetail={controller.openDetail}
            handleCheckIn={controller.handleCheckIn}
            openCancelDialog={controller.openCancelDialog}
            openRescheduleDialog={controller.openRescheduleDialog}
            handleComplete={controller.handleComplete}
          />
        </Grid>

        {hasDetail ? (
          <Grid size={{ xs: 12, md: 4 }}>
            <Collapse in={hasDetail} orientation="horizontal" unmountOnExit>
              <AppointmentDetailDialog
                appointment={controller.detailAppointment}
                onClose={controller.closeDetail}
              />
            </Collapse>
          </Grid>
        ) : null}
      </Grid>

      <CreateAppointmentDialog
        open={controller.createDialogOpen}
        onClose={controller.closeCreateDialog}
        onSuccess={handleRefreshWithToast}
      />

      <CancelAppointmentDialog
        open={controller.cancelDialogOpen}
        appointment={controller.selectedAppointment}
        onClose={controller.closeCancelDialog}
        onConfirm={controller.handleCancel}
      />

      <RescheduleAppointmentDialog
        open={controller.rescheduleDialogOpen}
        appointment={controller.selectedAppointment}
        onClose={controller.closeRescheduleDialog}
        onConfirm={controller.handleReschedule}
      />

      <SuccessSnackbar snackbar={snackbar} onClose={closeSnackbar} />

      <Snackbar
        open={!!controller.actionError}
        autoHideDuration={5000}
        onClose={controller.clearActionError}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="error" onClose={controller.clearActionError} variant="filled">
          {controller.actionError}
        </Alert>
      </Snackbar>
    </>
  );
}
