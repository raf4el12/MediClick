'use client';

import Box from '@mui/material/Box';
import { PageHeader } from '@/components/shared/PageHeader';
import Button from '@mui/material/Button';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Alert from '@mui/material/Alert';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import { alpha, useTheme } from '@mui/material/styles';

import { useMedicalHistory } from './hooks/useMedicalHistory';
import { MedicalHistoryKPIs } from './components/MedicalHistoryKPIs';
import { MedicalHistoryList } from './components/MedicalHistoryList';
import { MedicalHistoryDetail } from './components/MedicalHistoryDetail';
import { MedicalHistoryForm } from './components/MedicalHistoryForm';
import { MedicalHistoryDeleteDialog } from './components/MedicalHistoryDeleteDialog';
import { MedicalHistoryStatus } from './types';
import type { MedicalHistoryFormValues } from './functions/medical-history.schema';

const STATUS_OPTIONS = [
  { value: '', label: 'Todos los estados' },
  { value: MedicalHistoryStatus.ACTIVE, label: 'Activa' },
  { value: MedicalHistoryStatus.CHRONIC, label: 'Crónica' },
  { value: MedicalHistoryStatus.RESOLVED, label: 'Resuelta' },
];

export default function MedicalHistoryView() {
  const theme = useTheme();
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
      {/* Header */}
      <PageHeader title="Historial Médico" subtitle="Gestión del historial médico de los pacientes">
        <Button
          variant="contained"
          startIcon={<i className="ri-add-line" />}
          onClick={() => ctrl.setCreateOpen(true)}
          disabled={!ctrl.selectedPatient}
          sx={{ flexShrink: 0 }}
        >
          Nueva Entrada
        </Button>
      </PageHeader>

      {/* Filtros */}
      <Card sx={{ p: 2.5, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <Box sx={{ flex: 1, minWidth: 260 }}>
            <Autocomplete
              options={ctrl.patients}
              getOptionLabel={(p) => `${p.profile.name} ${p.profile.lastName}`}
              value={ctrl.selectedPatient}
              onChange={(_, value) => ctrl.handleSelectPatient(value)}
              loading={ctrl.loadingPatients}
              renderInput={(params) => (
                <TextField {...params} label="Buscar Paciente" size="small" placeholder="Nombre del paciente..." />
              )}
              isOptionEqualToValue={(opt, val) => opt.id === val.id}
            />
          </Box>

          <TextField
            select
            label="Estado"
            value={ctrl.statusFilter}
            onChange={(e) => ctrl.handleStatusFilter(e.target.value as MedicalHistoryStatus | '')}
            size="small"
            sx={{ minWidth: 170 }}
            disabled={!ctrl.selectedPatient}
          >
            {STATUS_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </TextField>

          {ctrl.selectedPatient && (
            <Chip
              icon={<i className="ri-user-heart-line" style={{ fontSize: 16 }} />}
              label={`${ctrl.selectedPatient.profile.name} ${ctrl.selectedPatient.profile.lastName}`}
              onDelete={() => ctrl.handleSelectPatient(null)}
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
      {ctrl.selectedPatient && ctrl.data.data.length > 0 && (
        <MedicalHistoryKPIs entries={ctrl.data.data} total={ctrl.data.total} />
      )}

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
