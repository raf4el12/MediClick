'use client';

import Box from '@mui/material/Box';
import { PageHeader } from '@/components/shared/PageHeader';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Alert from '@mui/material/Alert';
import Card from '@mui/material/Card';

import { useHolidays } from './hooks/useHolidays';
import { HolidayKPIs } from './components/HolidayKPIs';
import { HolidayList } from './components/HolidayList';
import { HolidayForm } from './components/HolidayForm';
import { HolidayDeleteDialog } from './components/HolidayDeleteDialog';
import type { HolidayFormValues } from './functions/holiday.schema';

const YEAR_OPTIONS = [2024, 2025, 2026, 2027, 2028, 2029, 2030];

export default function HolidaysView() {
  const ctrl = useHolidays();

  const handleFormSubmit = (values: HolidayFormValues) => {
    if (ctrl.editEntry) {
      void ctrl.handleUpdate(ctrl.editEntry.id, {
        name: values.name,
        date: values.date,
        isRecurring: values.isRecurring,
        clinicId: values.clinicId,
      });
    } else {
      void ctrl.handleCreate({
        name: values.name,
        date: values.date,
        isRecurring: values.isRecurring,
        clinicId: values.clinicId,
      });
    }
  };

  return (
    <>
      {/* Header */}
      <PageHeader title="Feriados" subtitle="Gestión de feriados y días no laborables">
        <Button
          variant="outlined"
          color="secondary"
          startIcon={<i className="ri-plant-line" />}
          onClick={ctrl.handleSeed}
          disabled={ctrl.seeding}
        >
          Sembrar Feriados
        </Button>
        <Button
          variant="contained"
          startIcon={<i className="ri-add-line" />}
          onClick={() => ctrl.setCreateOpen(true)}
        >
          Nuevo Feriado
        </Button>
      </PageHeader>

      {/* Filtros */}
      <Card sx={{ p: 2.5, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField
            select
            label="Año"
            value={ctrl.yearFilter}
            onChange={(e) => ctrl.handleYearChange(Number(e.target.value))}
            size="small"
            sx={{ minWidth: 170 }}
          >
            {YEAR_OPTIONS.map((year) => (
              <MenuItem key={year} value={year}>
                {year}
              </MenuItem>
            ))}
          </TextField>
        </Box>
      </Card>

      {/* KPIs */}
      {ctrl.data.rows.length > 0 && (
        <HolidayKPIs entries={ctrl.data.rows} total={ctrl.data.totalRows} />
      )}

      {/* Error */}
      {ctrl.error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {ctrl.error}
        </Alert>
      )}

      {/* Lista */}
      <HolidayList
        entries={ctrl.data.rows}
        clinics={ctrl.clinics}
        loading={ctrl.loading}
        totalPages={ctrl.data.totalPages}
        page={ctrl.page}
        onPageChange={ctrl.handlePageChange}
        onEdit={ctrl.setEditEntry}
        onDelete={ctrl.setDeleteEntry}
      />

      {/* Diálogos */}
      <HolidayForm
        open={ctrl.createOpen || !!ctrl.editEntry}
        onClose={ctrl.closeFormDialog}
        onSubmit={handleFormSubmit}
        entry={ctrl.editEntry}
        clinics={ctrl.clinics}
        submitting={ctrl.submitting}
        apiError={ctrl.formError}
      />

      <HolidayDeleteDialog
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
