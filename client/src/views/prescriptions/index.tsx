'use client';

import { useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import type { ColumnDef } from '@tanstack/react-table';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import { formatDate } from '@/utils/formatDate';
import type { Appointment } from '@/views/appointments/types';
import ClinicalAppointmentsTable from '@/views/clinical-shared/components/ClinicalAppointmentsTable';
import ClinicalDrawer from '@/views/clinical-shared/components/ClinicalDrawer';
import { usePrescriptions } from './hooks/usePrescriptions';

// El panel (con el formulario de receta) se carga recién al abrir el drawer.
const PrescriptionPanel = dynamic(() => import('./components/PrescriptionPanel').then((m) => m.PrescriptionPanel), {
  loading: () => <Skeleton variant='rounded' height={160} />,
});

/** Recetas por cita: tabla de citas y drawer con la receta de la cita elegida. */
export default function PrescriptionsView() {
  const controller = usePrescriptions();
  const { selectedId, selectedAppointment, prescription } = controller;

  const prescriptionColumn = useMemo<ColumnDef<Appointment, unknown>>(
    () => ({
      id: 'prescription',
      header: 'Receta',
      cell: ({ row }) => ((row.original.id === selectedId ? !!prescription : row.original.hasPrescription) ? 'Con receta' : 'Sin receta'),
    }),
    [selectedId, prescription],
  );
  const ariaLabel = useCallback((name: string) => `Ver receta de ${name}`, []);

  // Con un enlace directo a una cita de otra página, el nombre sale de la receta.
  const title = selectedAppointment
    ? `${selectedAppointment.patient.name} ${selectedAppointment.patient.lastName}`
    : prescription
      ? `${prescription.patient.name} ${prescription.patient.lastName}`
      : `Cita ${selectedId ?? ''}`;
  const subtitle = selectedAppointment
    ? `${selectedAppointment.schedule.specialty.name} · ${formatDate(selectedAppointment.schedule.scheduleDate)}`
    : undefined;

  return (
    <div className='flex flex-col gap-6'>
      <div>
        <Typography variant='h4' component='h1'>
          Recetas
        </Typography>
        <Typography color='text.secondary'>La receta de cada cita, con su PDF.</Typography>
      </div>
      <ClinicalAppointmentsTable
        data={controller.data}
        loading={controller.loading}
        error={controller.error}
        pagination={controller.pagination}
        setPagination={controller.setPagination}
        filters={controller.filters}
        updateFilters={controller.updateFilters}
        debouncedSearch={controller.debouncedSearch}
        onRetry={() => void controller.refresh()}
        extraColumn={prescriptionColumn}
        actionLabel='Receta'
        actionAriaLabel={ariaLabel}
        onOpen={controller.selectAppointment}
      />
      <ClinicalDrawer open={selectedId !== null} label='Receta' title={title} subtitle={subtitle} onClose={controller.clearSelection}>
        {selectedId !== null && (
          <PrescriptionPanel
            appointmentId={selectedId}
            prescription={prescription}
            loadingPrescription={controller.loadingPrescription}
            loadingCreate={controller.loadingCreate}
            panelError={controller.panelError}
            createError={controller.createError}
            onCreatePrescription={controller.createPrescription}
            onDownloadPdf={() => void controller.downloadPdf(selectedId)}
            loadingDownload={controller.loadingDownload}
          />
        )}
      </ClinicalDrawer>
    </div>
  );
}
