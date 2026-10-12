'use client';

import dynamic from 'next/dynamic';
import Typography from '@mui/material/Typography';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog/ConfirmDialog';
import { notify } from '@/utils/notify';
import { DoctorsTable } from './components/DoctorsTable';
import { EditDoctorDrawer } from './components/EditDoctorDrawer';
import { useDoctors } from './hooks/useDoctors';

const DoctorDetailDialog = dynamic(() => import('./components/DoctorDetailDialog').then((m) => m.DoctorDetailDialog));

/** Gestión de médicos: filtros, búsqueda y tabla paginada en el servidor (UI-22). */
export default function DoctorsView() {
  const controller = useDoctors();

  const handleCreated = () => {
    controller.refreshData();
    notify('Médico registrado');
  };

  const handleEdited = () => {
    controller.closeEditDrawer();
    controller.refreshData();
    notify('Médico actualizado');
  };

  const handleDelete = async () => {
    const ok = await controller.confirmDelete();
    notify(ok ? 'Médico eliminado' : 'No se pudo eliminar el médico', ok ? 'success' : 'error');
  };

  const toDelete = controller.deleteDoctor;

  return (
    <div className='flex flex-col gap-6'>
      <div>
        <Typography variant='h4' component='h1'>
          Médicos
        </Typography>
        <Typography color='text.secondary'>El equipo médico de la sede, sus especialidades y su estado.</Typography>
      </div>
      <DoctorsTable
        {...controller}
        onCreated={handleCreated}
        onEdit={controller.openEditDrawer}
        onDelete={controller.openDeleteDialog}
      />
      <DoctorDetailDialog doctor={controller.detailDoctor} onClose={controller.closeDetail} />
      <EditDoctorDrawer
        open={!!controller.editDoctor}
        doctor={controller.editDoctor}
        specialties={controller.specialties}
        clinics={controller.clinics}
        onClose={controller.closeEditDrawer}
        onSuccess={handleEdited}
      />
      <ConfirmDialog
        open={!!toDelete}
        title='¿Eliminar médico?'
        description={`Se eliminará a ${toDelete?.profile.name ?? ''} ${toDelete?.profile.lastName ?? ''}. Esta acción no se puede deshacer.`}
        confirmLabel='Eliminar'
        cancelLabel='Cancelar'
        destructive={false}
        onConfirm={() => void handleDelete()}
        onCancel={controller.closeDeleteDialog}
      />
    </div>
  );
}
