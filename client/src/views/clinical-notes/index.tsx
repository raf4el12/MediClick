'use client';

import { useMemo } from 'react';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Collapse from '@mui/material/Collapse';
import { useClinicalNotes } from './hooks/useClinicalNotes';
import { ClinicalNotesTable } from './components/ClinicalNotesTable';
import { ClinicalNotePanel } from './components/ClinicalNotePanel';

export default function ClinicalNotesView() {
  const controller = useClinicalNotes();
  const hasDetail = !!controller.selectedAppointment;

  // Mapa de conteo de notas por cita para mostrar indicador en la tabla
  const notesCounts = useMemo(() => {
    if (!controller.selectedAppointment) return {};

    return {
      [controller.selectedAppointment.id]: controller.notes.length,
    };
  }, [controller.selectedAppointment, controller.notes]);

  return (
    <>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
          Notas Clínicas
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Registro de notas clínicas por cita médica
        </Typography>
      </Box>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: hasDetail ? 8 : 12 }} sx={{ transition: 'all 0.3s ease' }}>
          <ClinicalNotesTable
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
            notesCounts={notesCounts}
          />
        </Grid>

        {hasDetail ? (
          <Grid size={{ xs: 12, md: 4 }}>
            <Collapse in={hasDetail} orientation="horizontal" unmountOnExit>
              <ClinicalNotePanel
                appointment={controller.selectedAppointment}
                notes={controller.notes}
                loadingNotes={controller.loadingNotes}
                loadingCreate={controller.loadingCreate}
                panelError={controller.panelError}
                onClose={controller.clearSelection}
                onCreateNote={controller.createNote}
              />
            </Collapse>
          </Grid>
        ) : null}
      </Grid>
    </>
  );
}
