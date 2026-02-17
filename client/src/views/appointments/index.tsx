'use client';

import Grid from '@mui/material/Grid';
import Collapse from '@mui/material/Collapse';
import { useAppointments } from './hooks/useAppointments';
import { AppointmentsTable } from './components/AppointmentsTable';
import { AppointmentDetailDialog } from './components/AppointmentDetailDialog';
import { CreateAppointmentDialog } from './components/CreateAppointmentDialog';
import { CancelAppointmentDialog } from './components/CancelAppointmentDialog';
import { RescheduleAppointmentDialog } from './components/RescheduleAppointmentDialog';

export default function AppointmentsView() {
  const controller = useAppointments();
  const hasDetail = !!controller.detailAppointment;

  return (
    <>
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

        {hasDetail && (
          <Grid size={{ xs: 12, md: 4 }}>
            <Collapse in={hasDetail} orientation="horizontal" unmountOnExit>
              <AppointmentDetailDialog
                appointment={controller.detailAppointment}
                onClose={controller.closeDetail}
              />
            </Collapse>
          </Grid>
        )}
      </Grid>

      <CreateAppointmentDialog
        open={controller.createDialogOpen}
        onClose={controller.closeCreateDialog}
        onSuccess={controller.refreshData}
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
    </>
  );
}
