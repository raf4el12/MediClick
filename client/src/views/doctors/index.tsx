'use client';

import { useCallback } from 'react';
import Grid from '@mui/material/Grid';
import { useDoctors } from './hooks/useDoctors';
import { DoctorsTable } from './components/DoctorsTable';
import { EditDoctorDrawer } from './components/EditDoctorDrawer';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog/ConfirmDialog';
import dynamic from 'next/dynamic';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import { useSnackbar } from '@/hooks/useSnackbar';
import { SuccessSnackbar } from '@/components/shared/SuccessSnackbar';

const DynamicLoading = () => (
  <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
    <CircularProgress size={28} />
  </Box>
);

const DoctorDetailDialog = dynamic(
  () => import('./components/DoctorDetailDialog').then((m) => m.DoctorDetailDialog),
  { loading: DynamicLoading },
);

export default function DoctorsView() {
  const controller = useDoctors();
  const { snackbar, showSnackbar, closeSnackbar } = useSnackbar();

  const handleCreateSuccess = useCallback(() => {
    controller.refreshData();
    showSnackbar('Doctor registrado exitosamente', 'success');
  }, [controller.refreshData, showSnackbar]);

  const handleEditSuccess = useCallback(() => {
    controller.closeEditDrawer();
    controller.refreshData();
    showSnackbar('Doctor actualizado exitosamente', 'success');
  }, [controller.closeEditDrawer, controller.refreshData, showSnackbar]);

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
        clinics={controller.clinics}
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
