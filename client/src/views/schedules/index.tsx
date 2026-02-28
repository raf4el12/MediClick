'use client';

import dynamic from 'next/dynamic';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import { useSchedules } from './hooks/useSchedules';

const SNACKBAR_ANCHOR = { vertical: 'bottom' as const, horizontal: 'right' as const };
import { ScheduleCalendar } from './components/ScheduleCalendar';

const GenerateDialog = dynamic(
  () => import('./components/GenerateDialog').then((m) => m.GenerateDialog),
);

export default function SchedulesView() {
  const {
    doctors,
    schedulesByDate,
    loading,
    weekStart,
    weekDays,
    goToPrevWeek,
    goToNextWeek,
    goToToday,
    selectedDoctorId,
    setSelectedDoctorId,
    totalSchedules,
    uniqueDoctors,
    scheduledDays,
    currentMonth,
    currentYear,
    generating,
    generateResult,
    generateDialogOpen,
    setGenerateDialogOpen,
    generateSuccess,
    setGenerateSuccess,
    handleGenerate,
    clearGenerateResult,
    selectedDate,
    setSelectedDate,
    goToPrevDay,
    goToNextDay,
  } = useSchedules();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Page Header */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', sm: 'center' },
          flexDirection: { xs: 'column', sm: 'row' },
          gap: 1.5,
        }}
      >
        <Box>
          <Typography variant="h5" fontWeight={700} letterSpacing="-0.3px">
            Horarios
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Vista semanal de los bloques horarios generados por la disponibilidad de cada doctor.
          </Typography>
        </Box>

        <Button
          variant="contained"
          size="small"
          startIcon={<i className="ri-magic-line" style={{ fontSize: 16 }} />}
          onClick={() => setGenerateDialogOpen(true)}
          sx={{ textTransform: 'none' }}
        >
          Generar Horarios
        </Button>
      </Box>

      {/* Weekly Calendar (includes toolbar, filters, KPI chips, and time grid) */}
      <ScheduleCalendar
        weekDays={weekDays}
        weekStart={weekStart}
        onPrevWeek={goToPrevWeek}
        onNextWeek={goToNextWeek}
        onToday={goToToday}
        schedulesByDate={schedulesByDate}
        loading={loading}
        doctors={doctors}
        selectedDoctorId={selectedDoctorId}
        onDoctorChange={setSelectedDoctorId}
        totalSchedules={totalSchedules}
        uniqueDoctors={uniqueDoctors}
        scheduledDays={scheduledDays}
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        onPrevDay={goToPrevDay}
        onNextDay={goToNextDay}
      />

      {/* Generate Dialog */}
      <GenerateDialog
        open={generateDialogOpen}
        onClose={() => setGenerateDialogOpen(false)}
        doctors={doctors}
        generating={generating}
        generateResult={generateResult}
        onGenerate={handleGenerate}
        onClearResult={clearGenerateResult}
        defaultMonth={currentMonth}
        defaultYear={currentYear}
      />

      {/* Success Snackbar */}
      <Snackbar
        open={generateSuccess}
        autoHideDuration={3000}
        onClose={() => setGenerateSuccess(false)}
        anchorOrigin={SNACKBAR_ANCHOR}
      >
        <Alert severity="success" variant="filled" onClose={() => setGenerateSuccess(false)}>
          Horarios generados correctamente
        </Alert>
      </Snackbar>
    </Box>
  );
}
