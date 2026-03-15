'use client';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import Alert from '@mui/material/Alert';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import { alpha, useTheme } from '@mui/material/styles';

import { useScheduleBlocks } from './hooks/useScheduleBlocks';
import { ScheduleBlockKPIs } from './components/ScheduleBlockKPIs';
import { ScheduleBlockList } from './components/ScheduleBlockList';
import { ScheduleBlockForm } from './components/ScheduleBlockForm';
import { ScheduleBlockDeleteDialog } from './components/ScheduleBlockDeleteDialog';
import type { ScheduleBlockFormValues } from './functions/schedule-block.schema';
import type { ScheduleBlockType } from './types';

export default function ScheduleBlocksView() {
  const theme = useTheme();
  const ctrl = useScheduleBlocks();

  const handleFormSubmit = async (values: ScheduleBlockFormValues) => {
    if (ctrl.editEntry) {
      await ctrl.handleUpdate(ctrl.editEntry.id, {
        type: values.type as ScheduleBlockType,
        startDate: values.startDate,
        endDate: values.endDate,
        timeFrom: values.timeFrom || undefined,
        timeTo: values.timeTo || undefined,
        reason: values.reason,
      });
    } else {
      await ctrl.handleCreate({
        doctorId: values.doctorId,
        type: values.type as ScheduleBlockType,
        startDate: values.startDate,
        endDate: values.endDate,
        timeFrom: values.timeFrom || undefined,
        timeTo: values.timeTo || undefined,
        reason: values.reason,
      });
    }
  };

  return (
    <>
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', sm: 'center' },
          flexDirection: { xs: 'column', sm: 'row' },
          gap: 2,
          mb: 3,
        }}
      >
        <Box>
          <Typography variant="h4" fontWeight={700} sx={{ mb: 0.5 }}>
            Bloqueos de Horario
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Gestión de bloqueos de horario para doctores
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<i className="ri-add-line" />}
          onClick={() => ctrl.setCreateOpen(true)}
          sx={{ flexShrink: 0 }}
        >
          Nuevo Bloqueo
        </Button>
      </Box>

      {/* Filtros */}
      <Card sx={{ p: 2.5, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <Box sx={{ flex: 1, minWidth: 260 }}>
            <Autocomplete
              options={ctrl.doctors}
              getOptionLabel={(d) => `${d.profile.name} ${d.profile.lastName}`}
              value={ctrl.selectedDoctor}
              onChange={(_, value) => ctrl.handleSelectDoctor(value)}
              loading={ctrl.loadingDoctors}
              renderInput={(params) => (
                <TextField {...params} label="Filtrar por Doctor" size="small" placeholder="Nombre del doctor..." />
              )}
              isOptionEqualToValue={(opt, val) => opt.id === val.id}
            />
          </Box>

          {ctrl.selectedDoctor && (
            <Chip
              icon={<i className="ri-stethoscope-line" style={{ fontSize: 16 }} />}
              label={`${ctrl.selectedDoctor.profile.name} ${ctrl.selectedDoctor.profile.lastName}`}
              onDelete={() => ctrl.handleSelectDoctor(null)}
              sx={{
                bgcolor: alpha(theme.palette.primary.main, 0.08),
                fontWeight: 500,
                '& .MuiChip-deleteIcon': { color: 'text.secondary' },
              }}
            />
          )}
        </Box>
      </Card>

      {/* KPIs */}
      {ctrl.data.rows.length > 0 && (
        <ScheduleBlockKPIs entries={ctrl.data.rows} total={ctrl.data.totalRows} />
      )}

      {/* Error */}
      {ctrl.error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {ctrl.error}
        </Alert>
      )}

      {/* Lista */}
      <ScheduleBlockList
        entries={ctrl.data.rows}
        loading={ctrl.loading}
        totalPages={ctrl.data.totalPages}
        page={ctrl.page}
        onPageChange={ctrl.handlePageChange}
        onEdit={(e) => ctrl.setEditEntry(e)}
        onDelete={(e) => ctrl.setDeleteEntry(e)}
      />

      {/* Diálogos */}
      <ScheduleBlockForm
        open={ctrl.createOpen || !!ctrl.editEntry}
        onClose={() => {
          ctrl.setCreateOpen(false);
          ctrl.setEditEntry(null);
        }}
        onSubmit={handleFormSubmit}
        entry={ctrl.editEntry}
        doctors={ctrl.doctors}
        submitting={ctrl.submitting}
      />

      <ScheduleBlockDeleteDialog
        entry={ctrl.deleteEntry}
        open={!!ctrl.deleteEntry}
        onClose={() => ctrl.setDeleteEntry(null)}
        onConfirm={() => {
          if (ctrl.deleteEntry) {
            void ctrl.handleDelete(ctrl.deleteEntry.id);
          }
        }}
        submitting={ctrl.submitting}
      />
    </>
  );
}
