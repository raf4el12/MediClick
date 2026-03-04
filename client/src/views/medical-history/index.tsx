'use client';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Alert from '@mui/material/Alert';

import { useMedicalHistory } from './hooks/useMedicalHistory';
import { MedicalHistoryKPIs } from './components/MedicalHistoryKPIs';
import { MedicalHistoryList } from './components/MedicalHistoryList';
import { MedicalHistoryDetail } from './components/MedicalHistoryDetail';
import { MedicalHistoryForm } from './components/MedicalHistoryForm';
import { MedicalHistoryDeleteDialog } from './components/MedicalHistoryDeleteDialog';
import { MedicalHistoryStatus } from './types';
import type { MedicalHistoryFormValues } from './functions/medical-history.schema';

const STATUS_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: MedicalHistoryStatus.ACTIVE, label: 'Activa' },
  { value: MedicalHistoryStatus.CHRONIC, label: 'Crónica' },
  { value: MedicalHistoryStatus.RESOLVED, label: 'Resuelta' },
];

export default function MedicalHistoryView() {
  const ctrl = useMedicalHistory();

  const handleFormSubmit = async (values: MedicalHistoryFormValues) => {
    if (ctrl.editEntry) {
      const { patientId: _, ...updatePayload } = values;

      await ctrl.handleUpdate(ctrl.editEntry.id, {
        condition: updatePayload.condition,
        description: updatePayload.description || undefined,
        diagnosedDate: updatePayload.diagnosedDate || undefined,
        notes: updatePayload.notes || undefined,
      });
    } else {
      await ctrl.handleCreate({
        patientId: values.patientId,
        condition: values.condition,
        description: values.description || undefined,
        diagnosedDate: values.diagnosedDate || undefined,
        status: values.status as MedicalHistoryStatus | undefined,
        notes: values.notes || undefined,
      });
    }
  };

  return (
    <>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
          Historial Médico
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Gestión del historial médico de los pacientes
        </Typography>
      </Box>

      {/* KPIs */}
      {ctrl.selectedPatient && ctrl.data.data.length > 0 && (
        <MedicalHistoryKPIs entries={ctrl.data.data} total={ctrl.data.total} />
      )}

      {/* Filtros */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', alignItems: 'center' }}>
        <Autocomplete
          options={ctrl.patients}
          getOptionLabel={(p) => `${p.profile.name} ${p.profile.lastName}`}
          value={ctrl.selectedPatient}
          onChange={(_, value) => ctrl.handleSelectPatient(value)}
          loading={ctrl.loadingPatients}
          sx={{ minWidth: 300, flex: 1, maxWidth: 450 }}
          renderInput={(params) => (
            <TextField {...params} label="Seleccionar Paciente" size="small" />
          )}
          isOptionEqualToValue={(opt, val) => opt.id === val.id}
        />

        <TextField
          select
          label="Estado"
          value={ctrl.statusFilter}
          onChange={(e) => ctrl.handleStatusFilter(e.target.value as MedicalHistoryStatus | '')}
          size="small"
          sx={{ minWidth: 150 }}
          disabled={!ctrl.selectedPatient}
        >
          {STATUS_OPTIONS.map((opt) => (
            <MenuItem key={opt.value} value={opt.value}>
              {opt.label}
            </MenuItem>
          ))}
        </TextField>

        <Box sx={{ flex: 1 }} />

        <Button
          variant="contained"
          startIcon={<i className="ri-add-line" />}
          onClick={() => ctrl.setCreateOpen(true)}
          disabled={!ctrl.selectedPatient}
        >
          Nueva Entrada
        </Button>
      </Box>

      {/* Error */}
      {ctrl.error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {ctrl.error}
        </Alert>
      )}

      {/* Lista */}
      <MedicalHistoryList
        entries={ctrl.data.data}
        loading={ctrl.loading}
        totalPages={ctrl.data.totalPages}
        page={ctrl.page}
        onPageChange={ctrl.handlePageChange}
        onDetail={(e) => ctrl.setDetailEntry(e)}
        onEdit={(e) => ctrl.setEditEntry(e)}
        onStatusChange={ctrl.handleUpdateStatus}
        onDelete={(e) => ctrl.setDeleteEntry(e)}
      />

      {/* Diálogos */}
      <MedicalHistoryDetail
        entry={ctrl.detailEntry}
        open={!!ctrl.detailEntry}
        onClose={() => ctrl.setDetailEntry(null)}
      />

      <MedicalHistoryForm
        open={ctrl.createOpen || !!ctrl.editEntry}
        onClose={() => {
          ctrl.setCreateOpen(false);
          ctrl.setEditEntry(null);
        }}
        onSubmit={handleFormSubmit}
        entry={ctrl.editEntry}
        patients={ctrl.patients}
        selectedPatientId={ctrl.selectedPatient?.id}
        submitting={ctrl.submitting}
      />

      <MedicalHistoryDeleteDialog
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
