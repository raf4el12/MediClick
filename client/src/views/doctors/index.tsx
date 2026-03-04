'use client';

import Grid from '@mui/material/Grid';
import { useDoctors } from './hooks/useDoctors';
import { DoctorsTable } from './components/DoctorsTable';
import { EditDoctorDrawer } from './components/EditDoctorDrawer';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog/ConfirmDialog';
import dynamic from 'next/dynamic';
import { useSnackbar } from '@/hooks/useSnackbar';
import { SuccessSnackbar } from '@/components/shared/SuccessSnackbar';

const DoctorDetailDialog = dynamic(
  () => import('./components/DoctorDetailDialog').then((m) => m.DoctorDetailDialog),
);

export default function DoctorsView() {
  const controller = useDoctors();
  const { snackbar, showSnackbar, closeSnackbar } = useSnackbar();

  const handleCreateSuccess = () => {
    controller.refreshData();
    showSnackbar('Doctor registrado exitosamente', 'success');
  };

  const handleEditSuccess = () => {
    controller.closeEditDrawer();
    controller.refreshData();
    showSnackbar('Doctor actualizado exitosamente', 'success');
  };

  const handleDelete = async () => {
    const success = await controller.confirmDelete();
    if (success) {
      showSnackbar('Doctor eliminado exitosamente', 'success');
    } else {
      showSnackbar('Error al eliminar el doctor', 'error');
    }
  };

  return (
    <Grid container spacing={3}>
      <Grid size={12}>
        <DoctorsTable
          {...controller}
          refreshData={handleCreateSuccess}
          onEdit={controller.openEditDrawer}
          onDelete={controller.openDeleteDialog}
        />
      </Grid>

      <DoctorDetailDialog
        doctor={controller.detailDoctor}
        onClose={controller.closeDetail}
      />

      <EditDoctorDrawer
        open={!!controller.editDoctor}
        doctor={controller.editDoctor}
        specialties={controller.specialties}
        onClose={controller.closeEditDrawer}
        onSuccess={handleEditSuccess}
      />

      <ConfirmDialog
        open={!!controller.deleteDoctor}
        title="¿Eliminar doctor?"
        description={`Se eliminará al doctor ${controller.deleteDoctor?.profile.name ?? ''} ${controller.deleteDoctor?.profile.lastName ?? ''}. Esta acción no se puede deshacer.`}
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
