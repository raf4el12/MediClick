'use client';

import { useState, useCallback } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Stepper from '@mui/material/Stepper';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Chip from '@mui/material/Chip';
import TextField from '@mui/material/TextField';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Divider from '@mui/material/Divider';
import { useTheme, alpha } from '@mui/material/styles';
import { debounce } from '@/utils/debounce';
import { useAppointmentForm } from '../hooks/useAppointmentForm';

interface CreateAppointmentDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const steps = ['Especialidad', 'Doctor', 'Horario', 'Paciente y Motivo'];

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('es-MX', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

export function CreateAppointmentDialog({
  open,
  onClose,
  onSuccess,
}: CreateAppointmentDialogProps) {
  const theme = useTheme();
  const form = useAppointmentForm({ open, onSuccess, onClose });
  const [patientSearch, setPatientSearch] = useState('');

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedPatientSearch = useCallback(
    debounce((value: string) => {
      void form.searchPatients(value);
    }, 400),
    [form.searchPatients],
  );

  const handlePatientSearchChange = (value: string) => {
    setPatientSearch(value);
    debouncedPatientSearch(value);
  };

  // Group schedules by date
  const schedulesByDate = form.schedules.reduce<Record<string, typeof form.schedules>>(
    (acc, schedule) => {
      const dateKey = schedule.scheduleDate.split('T')[0] ?? schedule.scheduleDate;
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(schedule);
      return acc;
    },
    {},
  );

  const renderStepContent = () => {
    switch (form.activeStep) {
      case 0:
        return (
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Seleccione la especialidad médica
            </Typography>
            {form.loadingSpecialties ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : (
              <Grid container spacing={2}>
                {form.specialties.map((specialty) => (
                  <Grid size={{ xs: 12, sm: 6, md: 4 }} key={specialty.id}>
                    <Card
                      variant="outlined"
                      sx={{
                        p: 2,
                        cursor: 'pointer',
                        borderColor:
                          form.selectedSpecialtyId === specialty.id
                            ? 'primary.main'
                            : 'divider',
                        bgcolor:
                          form.selectedSpecialtyId === specialty.id
                            ? alpha(theme.palette.primary.main, 0.08)
                            : 'transparent',
                        transition: 'all 0.2s',
                        '&:hover': {
                          borderColor: 'primary.main',
                          bgcolor: alpha(theme.palette.primary.main, 0.04),
                        },
                      }}
                      onClick={() => form.setSelectedSpecialtyId(specialty.id)}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box
                          sx={{
                            width: 40,
                            height: 40,
                            borderRadius: 2,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            bgcolor: alpha(theme.palette.primary.main, 0.1),
                            color: theme.palette.primary.main,
                          }}
                        >
                          <i className="ri-stethoscope-line" style={{ fontSize: 20 }} />
                        </Box>
                        <Typography variant="body1" fontWeight={500}>
                          {specialty.name}
                        </Typography>
                      </Box>
                    </Card>
                  </Grid>
                ))}
                {form.specialties.length === 0 && (
                  <Grid size={12}>
                    <Typography color="text.secondary" textAlign="center" sx={{ py: 4 }}>
                      No hay especialidades disponibles
                    </Typography>
                  </Grid>
                )}
              </Grid>
            )}
          </Box>
        );

      case 1:
        return (
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Seleccione el doctor
            </Typography>
            {form.loadingDoctors ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : (
              <Grid container spacing={2}>
                {form.doctors.map((doctor) => (
                  <Grid size={{ xs: 12, sm: 6 }} key={doctor.id}>
                    <Card
                      variant="outlined"
                      sx={{
                        p: 2,
                        cursor: 'pointer',
                        borderColor:
                          form.selectedDoctorId === doctor.id
                            ? 'primary.main'
                            : 'divider',
                        bgcolor:
                          form.selectedDoctorId === doctor.id
                            ? alpha(theme.palette.primary.main, 0.08)
                            : 'transparent',
                        transition: 'all 0.2s',
                        '&:hover': {
                          borderColor: 'primary.main',
                          bgcolor: alpha(theme.palette.primary.main, 0.04),
                        },
                      }}
                      onClick={() => form.setSelectedDoctorId(doctor.id)}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box
                          sx={{
                            width: 40,
                            height: 40,
                            borderRadius: 2,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            bgcolor: alpha(theme.palette.info.main, 0.1),
                            color: theme.palette.info.main,
                          }}
                        >
                          <i className="ri-user-heart-line" style={{ fontSize: 20 }} />
                        </Box>
                        <Box>
                          <Typography variant="body1" fontWeight={500}>
                            Dr. {doctor.profile.name} {doctor.profile.lastName}
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5, flexWrap: 'wrap' }}>
                            {doctor.specialties.map((sp) => (
                              <Chip key={sp.id} label={sp.name} size="small" variant="outlined" />
                            ))}
                          </Box>
                        </Box>
                      </Box>
                    </Card>
                  </Grid>
                ))}
                {form.doctors.length === 0 && (
                  <Grid size={12}>
                    <Typography color="text.secondary" textAlign="center" sx={{ py: 4 }}>
                      No hay doctores disponibles para esta especialidad
                    </Typography>
                  </Grid>
                )}
              </Grid>
            )}
          </Box>
        );

      case 2:
        return (
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Seleccione el horario disponible
            </Typography>
            {form.loadingSchedules ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : Object.keys(schedulesByDate).length > 0 ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {Object.entries(schedulesByDate).map(([dateKey, slots]) => (
                  <Box key={dateKey}>
                    <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1.5 }}>
                      {formatDate(dateKey)}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      {slots.map((slot) => (
                        <Chip
                          key={slot.id}
                          label={`${slot.timeFrom} - ${slot.timeTo}`}
                          onClick={() => form.setSelectedScheduleId(slot.id)}
                          color={form.selectedScheduleId === slot.id ? 'primary' : 'default'}
                          variant={form.selectedScheduleId === slot.id ? 'filled' : 'outlined'}
                          sx={{ cursor: 'pointer' }}
                        />
                      ))}
                    </Box>
                  </Box>
                ))}
              </Box>
            ) : (
              <Typography color="text.secondary" textAlign="center" sx={{ py: 4 }}>
                No hay horarios disponibles para este doctor
              </Typography>
            )}
          </Box>
        );

      case 3:
        return (
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Busque y seleccione el paciente
            </Typography>

            <TextField
              fullWidth
              size="small"
              placeholder="Buscar paciente por nombre o email..."
              value={patientSearch}
              onChange={(e) => handlePatientSearchChange(e.target.value)}
              sx={{ mb: 2 }}
              slotProps={{
                input: {
                  startAdornment: (
                    <i
                      className="ri-search-line"
                      style={{ fontSize: 18, marginRight: 8, opacity: 0.6 }}
                    />
                  ),
                  endAdornment: form.loadingPatients ? (
                    <CircularProgress size={20} />
                  ) : null,
                },
              }}
            />

            {form.patients.length > 0 && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 3 }}>
                {form.patients.map((patient) => (
                  <Card
                    key={patient.id}
                    variant="outlined"
                    sx={{
                      p: 1.5,
                      cursor: 'pointer',
                      borderColor:
                        form.selectedPatientId === patient.id
                          ? 'primary.main'
                          : 'divider',
                      bgcolor:
                        form.selectedPatientId === patient.id
                          ? alpha(theme.palette.primary.main, 0.08)
                          : 'transparent',
                      transition: 'all 0.2s',
                      '&:hover': {
                        borderColor: 'primary.main',
                      },
                    }}
                    onClick={() => form.setSelectedPatientId(patient.id)}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Box
                        sx={{
                          width: 36,
                          height: 36,
                          borderRadius: 1.5,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          bgcolor: alpha(theme.palette.success.main, 0.1),
                          color: theme.palette.success.main,
                        }}
                      >
                        <i className="ri-user-line" style={{ fontSize: 18 }} />
                      </Box>
                      <Box>
                        <Typography variant="body2" fontWeight={500}>
                          {patient.profile.name} {patient.profile.lastName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {patient.profile.email}
                        </Typography>
                      </Box>
                    </Box>
                  </Card>
                ))}
              </Box>
            )}

            <TextField
              fullWidth
              size="small"
              label="Motivo de consulta (opcional)"
              multiline
              rows={3}
              value={form.reason}
              onChange={(e) => form.setReason(e.target.value)}
            />

            {/* Summary */}
            {form.selectedPatientId && (
              <>
                <Divider sx={{ my: 3 }} />
                <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>
                  Resumen de la cita
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ minWidth: 100 }}>
                      Especialidad:
                    </Typography>
                    <Typography variant="body2" fontWeight={500}>
                      {form.selectedSpecialty?.name}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ minWidth: 100 }}>
                      Doctor:
                    </Typography>
                    <Typography variant="body2" fontWeight={500}>
                      Dr. {form.selectedDoctor?.profile.name} {form.selectedDoctor?.profile.lastName}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ minWidth: 100 }}>
                      Fecha:
                    </Typography>
                    <Typography variant="body2" fontWeight={500}>
                      {form.selectedSchedule ? formatDate(form.selectedSchedule.scheduleDate) : ''}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ minWidth: 100 }}>
                      Hora:
                    </Typography>
                    <Typography variant="body2" fontWeight={500}>
                      {form.selectedSchedule?.timeFrom} - {form.selectedSchedule?.timeTo}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ minWidth: 100 }}>
                      Paciente:
                    </Typography>
                    <Typography variant="body2" fontWeight={500}>
                      {form.selectedPatient?.profile.name} {form.selectedPatient?.profile.lastName}
                    </Typography>
                  </Box>
                  {form.reason && (
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Typography variant="body2" color="text.secondary" sx={{ minWidth: 100 }}>
                        Motivo:
                      </Typography>
                      <Typography variant="body2">{form.reason}</Typography>
                    </Box>
                  )}
                </Box>
              </>
            )}
          </Box>
        );

      default:
        return null;
    }
  };

  const isLastStep = form.activeStep === 3;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Nueva Cita Médica</DialogTitle>
      <DialogContent>
        <Stepper activeStep={form.activeStep} sx={{ mb: 4, mt: 1 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {form.error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {form.error}
          </Alert>
        )}

        {renderStepContent()}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit">
          Cancelar
        </Button>
        {form.activeStep > 0 && (
          <Button onClick={form.handleBack} disabled={form.submitting}>
            Atrás
          </Button>
        )}
        {isLastStep ? (
          <Button
            variant="contained"
            onClick={form.handleSubmit}
            disabled={!form.canGoNext() || form.submitting}
          >
            {form.submitting ? <CircularProgress size={24} /> : 'Confirmar Cita'}
          </Button>
        ) : (
          <Button
            variant="contained"
            onClick={form.handleNext}
            disabled={!form.canGoNext()}
          >
            Siguiente
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
