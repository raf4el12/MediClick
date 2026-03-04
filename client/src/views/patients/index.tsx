'use client';

import Grid from '@mui/material/Grid';
import Fade from '@mui/material/Fade';
import { usePatients } from './hooks/usePatients';
import { PatientsTable } from './components/PatientsTable';
import { EditPatientDrawer } from './components/EditPatientDrawer';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog/ConfirmDialog';
import dynamic from 'next/dynamic';
import { useSnackbar } from '@/hooks/useSnackbar';
import { SuccessSnackbar } from '@/components/shared/SuccessSnackbar';

const PatientDetailDialog = dynamic(
  () => import('./components/PatientDetailDialog').then((m) => m.PatientDetailDialog),
);

export default function PatientsView() {
  const controller = usePatients();
  const hasDetail = !!controller.detailPatient;
  const { snackbar, showSnackbar, closeSnackbar } = useSnackbar();

  const handleCreateSuccess = () => {
    controller.refreshData();
    showSnackbar('Paciente registrado exitosamente', 'success');
  };

  const handleEditSuccess = () => {
    controller.closeEditDrawer();
    controller.refreshData();
    showSnackbar('Paciente actualizado exitosamente', 'success');
  };

  const handleDelete = async () => {
    const success = await controller.confirmDelete();
    if (success) {
      showSnackbar('Paciente eliminado exitosamente', 'success');
    } else {
      showSnackbar('Error al eliminar el paciente', 'error');
    }
  };

  return (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12, md: hasDetail ? 8 : 12 }} sx={{ transition: 'all 0.3s ease' }}>
        <PatientsTable
          {...controller}
          refreshData={handleCreateSuccess}
          onEdit={controller.openEditDrawer}
          onDelete={controller.openDeleteDialog}
        />
      </Grid>

      {hasDetail ? (
        <Grid size={{ xs: 12, md: 4 }}>
          <Fade in={hasDetail} timeout={300}>
            <div>
              <PatientDetailDialog
                patient={controller.detailPatient}
                onClose={controller.closeDetail}
              />
            </div>
          </Fade>
        </Grid>
      ) : null}

      <EditPatientDrawer
        open={!!controller.editPatient}
        patient={controller.editPatient}
        onClose={controller.closeEditDrawer}
        onSuccess={handleEditSuccess}
      />

      <ConfirmDialog
        open={!!controller.deletePatient}
        title="¿Eliminar paciente?"
        description={`Se eliminará al paciente ${controller.deletePatient?.profile.name ?? ''} ${controller.deletePatient?.profile.lastName ?? ''}. Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        destructive
        onConfirm={() => void handleDelete()}
        onCancel={controller.closeDeleteDialog}
      />

      <SuccessSnackbar snackbar={snackbar} onClose={closeSnackbar} />
    </Grid>
  );
}
