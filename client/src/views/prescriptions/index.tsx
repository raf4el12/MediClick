'use client';

import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Collapse from '@mui/material/Collapse';
import { usePrescriptions } from './hooks/usePrescriptions';
import { PrescriptionsTable } from './components/PrescriptionsTable';
import { PrescriptionPanel } from './components/PrescriptionPanel';

export default function PrescriptionsView() {
  const controller = usePrescriptions();
  const hasDetail = !!controller.selectedAppointment;

  // Mapa de IDs de citas que tienen receta para mostrar indicador en la tabla
  const prescriptionIds: Record<number, boolean> = {};
  if (controller.selectedAppointment && controller.prescription) {
    prescriptionIds[controller.selectedAppointment.id] = true;
  }

  return (
    <>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
          Recetas Médicas
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Gestión de recetas médicas por cita
        </Typography>
      </Box>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: hasDetail ? 8 : 12 }} sx={{ transition: 'all 0.3s ease' }}>
          <PrescriptionsTable
            data={controller.data}
            loading={controller.loading}
            error={controller.error}
            pagination={controller.pagination}
            filters={controller.filters}
            setPagination={controller.setPagination}
            debouncedSearch={controller.debouncedSearch}
            updateFilters={controller.updateFilters}
            selectedAppointment={controller.selectedAppointment}
            onSelectAppointment={controller.selectAppointment}
            prescriptionIds={prescriptionIds}
          />
        </Grid>

        {hasDetail && (
          <Grid size={{ xs: 12, md: 4 }}>
            <Collapse in={hasDetail} orientation="horizontal" unmountOnExit>
              <PrescriptionPanel
                appointment={controller.selectedAppointment}
                prescription={controller.prescription}
                loadingPrescription={controller.loadingPrescription}
                loadingCreate={controller.loadingCreate}
                panelError={controller.panelError}
                onClose={controller.clearSelection}
                onCreatePrescription={controller.createPrescription}
              />
            </Collapse>
          </Grid>
        )}
      </Grid>
    </>
  );
}
