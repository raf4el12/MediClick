'use client';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useAvailability } from './hooks/useAvailability';
import { DoctorSelector } from './components/DoctorSelector';
import { AvailabilitySummary } from './components/AvailabilitySummary';
import { WeeklyScheduleConfigurator } from './components/WeeklyScheduleConfigurator';

export default function AvailabilityView() {
  const {
    doctors,
    selectedDoctorId,
    setSelectedDoctorId,
    selectedDoctor,
    selectedSpecialtyId,
    setSelectedSpecialtyId,
    doctorSpecialties,
    schedule,
    dateRange,
    setDateRange,
    error,
    saving,
    saveSuccess,
    setSaveSuccess,
    activeDays,
    weeklyHours,
    toggleDay,
    addSlot,
    removeSlot,
    updateSlot,
    handleSave,
  } = useAvailability();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Page Header */}
      <Box>
        <Typography variant="h5" fontWeight={700} letterSpacing="-0.3px">
          Disponibilidad
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Configura el horario base semanal de cada doctor.
        </Typography>
      </Box>

      {/* Doctor Selection */}
      <DoctorSelector
        doctors={doctors}
        selectedDoctorId={selectedDoctorId}
        onDoctorChange={setSelectedDoctorId}
        selectedDoctor={selectedDoctor}
        selectedSpecialtyId={selectedSpecialtyId}
        onSpecialtyChange={setSelectedSpecialtyId}
        doctorSpecialties={doctorSpecialties}
      />

      {/* Summary KPIs + Weekly Schedule only when doctor selected */}
      {selectedDoctorId && (
        <>
          <AvailabilitySummary
            activeDays={activeDays}
            weeklyHours={weeklyHours}
          />

          <WeeklyScheduleConfigurator
            schedule={schedule}
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            saving={saving}
            saveSuccess={saveSuccess}
            onSaveSuccessClose={() => setSaveSuccess(false)}
            error={error}
            hasDoctor={!!selectedDoctorId}
            hasSpecialty={!!selectedSpecialtyId}
            onToggleDay={toggleDay}
            onAddSlot={addSlot}
            onRemoveSlot={removeSlot}
            onUpdateSlot={updateSlot}
            onSave={() => void handleSave()}
          />
        </>
      )}
    </Box>
  );
}
