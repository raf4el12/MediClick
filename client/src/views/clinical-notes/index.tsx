'use client';

import { useCallback, useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import Typography from '@mui/material/Typography';
import { formatDate } from '@/utils/formatDate';
import type { Appointment } from '@/views/appointments/types';
import ClinicalAppointmentsTable from '@/views/clinical-shared/components/ClinicalAppointmentsTable';
import ClinicalDrawer from '@/views/clinical-shared/components/ClinicalDrawer';
import { ClinicalNotePanel } from './components/ClinicalNotePanel';
import { useClinicalNotes } from './hooks/useClinicalNotes';

const notesLabel = (count: number) => (count === 0 ? '—' : `${count} ${count === 1 ? 'nota' : 'notas'}`);

/** Notas clínicas por cita: tabla de citas y drawer con las notas de la cita elegida. */
export default function ClinicalNotesView() {
  const controller = useClinicalNotes();
  const { selectedId, selectedAppointment, notes } = controller;

  const notesColumn = useMemo<ColumnDef<Appointment, unknown>>(
    () => ({
      id: 'notes',
      header: 'Notas',
      cell: ({ row }) => notesLabel(row.original.id === selectedId ? notes.length : (row.original.notesCount ?? 0)),
    }),
    [selectedId, notes.length],
  );
  const ariaLabel = useCallback((name: string) => `Ver notas de ${name}`, []);

  // Con un enlace directo a una cita de otra página, el nombre sale de sus notas.
  const title = selectedAppointment
    ? `${selectedAppointment.patient.name} ${selectedAppointment.patient.lastName}`
    : notes[0]
      ? `${notes[0].patient.name} ${notes[0].patient.lastName}`
      : `Cita ${selectedId ?? ''}`;
  const subtitle = selectedAppointment
    ? `${selectedAppointment.schedule.specialty.name} · ${formatDate(selectedAppointment.schedule.scheduleDate)}`
    : undefined;

  return (
    <div className='flex flex-col gap-6'>
      <div>
        <Typography variant='h4' component='h1'>
          Notas clínicas
        </Typography>
        <Typography color='text.secondary'>Diagnóstico, resumen y plan de cada cita.</Typography>
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
        extraColumn={notesColumn}
        actionLabel='Notas'
        actionAriaLabel={ariaLabel}
        onOpen={controller.selectAppointment}
      />
      <ClinicalDrawer open={selectedId !== null} label='Notas clínicas' title={title} subtitle={subtitle} onClose={controller.clearSelection}>
        {selectedId !== null && (
          <ClinicalNotePanel
            appointmentId={selectedId}
            notes={notes}
            loadingNotes={controller.loadingNotes}
            loadingCreate={controller.loadingCreate}
            panelError={controller.panelError}
            createError={controller.createError}
            onCreateNote={controller.createNote}
          />
        )}
      </ClinicalDrawer>
    </div>
  );
}
