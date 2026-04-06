'use client';

import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import { PageHeader } from '@/components/shared/PageHeader';
import Collapse from '@mui/material/Collapse';
import { useDoctorDashboard } from '../hooks/useDoctorDashboard';
import { DoctorStatCards } from '../components/DoctorStatCards';
import { TodayAppointmentsList } from '../components/TodayAppointmentsList';
import { AppointmentDetailPanel } from './components/AppointmentDetailPanel';

export default function DoctorAppointmentsView() {
  const controller = useDoctorDashboard();
  const hasDetail = !!controller.selectedAppointment;

  return (
    <>
      <PageHeader
        title="Mis Citas de Hoy"
        subtitle="Gestiona las consultas del día — notas clínicas, recetas y completar citas"
      />

      <Box sx={{ mb: 3 }}>
        <DoctorStatCards stats={controller.stats} loading={controller.loadingAppointments} />
      </Box>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: hasDetail ? 5 : 12 }} sx={{ transition: 'all 0.3s ease' }}>
          <TodayAppointmentsList
            appointments={controller.appointments}
            loading={controller.loadingAppointments}
            error={controller.appointmentsError}
            selectedId={controller.selectedAppointment?.id ?? null}
            onSelect={controller.selectAppointment}
          />
        </Grid>

        {hasDetail && (
          <Grid size={{ xs: 12, md: 7 }}>
            <Collapse in={hasDetail} orientation="horizontal" unmountOnExit>
              <AppointmentDetailPanel
                appointment={controller.selectedAppointment}
                notes={controller.notes}
                prescription={controller.prescription}
                loadingNotes={controller.loadingNotes}
                loadingPrescription={controller.loadingPrescription}
                actionLoading={controller.actionLoading}
                actionError={controller.actionError}
                onClose={controller.clearSelection}
                onComplete={controller.completeAppointment}
                onCreateNote={controller.createNote}
                onCreatePrescription={controller.createPrescription}
              />
            </Collapse>
          </Grid>
        )}
      </Grid>
    </>
  );
}
