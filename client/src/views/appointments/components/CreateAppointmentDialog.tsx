'use client';

import { useState, useCallback, useRef } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Chip from '@mui/material/Chip';
import TextField from '@mui/material/TextField';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Divider from '@mui/material/Divider';
import Avatar from '@mui/material/Avatar';
import IconButton from '@mui/material/IconButton';
import { useTheme, alpha } from '@mui/material/styles';
import { debounce } from '@/utils/debounce';
import { useAppointmentForm } from '../hooks/useAppointmentForm';

interface CreateAppointmentDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const steps = [
  { label: 'Especialidad', icon: 'ri-stethoscope-line' },
  { label: 'Doctor', icon: 'ri-user-heart-line' },
  { label: 'Horario', icon: 'ri-calendar-line' },
  { label: 'Confirmar', icon: 'ri-check-double-line' },
];

const WEEKDAY_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MONTH_SHORT = [
  'ene', 'feb', 'mar', 'abr', 'may', 'jun',
  'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
];

const AVATAR_COLORS = ['primary', 'info', 'success'] as const;

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('es-MX', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function parseDateParts(dateStr: string) {
  const date = new Date(dateStr + 'T00:00:00');
  return {
    dayName: WEEKDAY_SHORT[date.getDay()]!,
    dayNumber: date.getDate(),
    monthName: MONTH_SHORT[date.getMonth()]!,
  };
}

export function CreateAppointmentDialog({
  open,
  onClose,
  onSuccess,
}: CreateAppointmentDialogProps) {
  const theme = useTheme();
  const form = useAppointmentForm({ open, onSuccess, onClose });
  const [patientSearch, setPatientSearch] = useState('');
  const dateScrollRef = useRef<HTMLDivElement>(null);

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

  const scrollDates = (direction: 'left' | 'right') => {
    if (dateScrollRef.current) {
      const scrollAmount = direction === 'left' ? -200 : 200;
      dateScrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  // Breadcrumb de selecciones previas
  const breadcrumbs: string[] = [];
  if (form.activeStep >= 1 && form.selectedSpecialty) {
    breadcrumbs.push(form.selectedSpecialty.name);
  }
  if (form.activeStep >= 2 && form.selectedDoctor) {
    breadcrumbs.push(`Dr. ${form.selectedDoctor.profile.name} ${form.selectedDoctor.profile.lastName}`);
  }
  if (form.activeStep >= 3 && form.selectedSchedule) {
    const dateKey = form.selectedSchedule.scheduleDate.split('T')[0] ?? form.selectedSchedule.scheduleDate;
    breadcrumbs.push(`${formatDate(dateKey)} ${form.selectedSchedule.timeFrom}`);
  }

  const renderStepper = () => (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 1 }}>
      {steps.map((step, idx) => {
        const isActive = idx === form.activeStep;
        const isCompleted = idx < form.activeStep;
        return (
          <Box key={step.label} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: isActive
                  ? 'primary.main'
                  : isCompleted
                    ? alpha(theme.palette.primary.main, 0.15)
                    : alpha(theme.palette.text.disabled, 0.08),
                color: isActive
                  ? 'primary.contrastText'
                  : isCompleted
                    ? 'primary.main'
                    : 'text.disabled',
                transition: 'all 0.3s',
              }}
            >
              {isCompleted ? (
                <i className="ri-check-line" style={{ fontSize: 18 }} />
              ) : (
                <i className={step.icon} style={{ fontSize: 18 }} />
              )}
            </Box>
            <Typography
              variant="caption"
              fontWeight={isActive ? 600 : 400}
              color={isActive ? 'primary.main' : 'text.secondary'}
              sx={{ display: { xs: 'none', sm: 'block' } }}
            >
              {step.label}
            </Typography>
            {idx < steps.length - 1 && (
              <Box
                sx={{
                  width: 24,
                  height: 2,
                  borderRadius: 1,
                  bgcolor: isCompleted
                    ? 'primary.main'
                    : alpha(theme.palette.text.disabled, 0.2),
                  mx: 0.5,
                }}
              />
            )}
          </Box>
        );
      })}
    </Box>
  );

  const renderStepContent = () => {
    switch (form.activeStep) {
      // ── Step 0: Especialidad ──
      case 0:
        return (
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
              Seleccione la especialidad médica
            </Typography>
            {form.loadingSpecialties ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : (
              <Grid container spacing={2}>
                {form.specialties.map((specialty) => {
                  const isSelected = form.selectedSpecialtyId === specialty.id;
                  return (
                    <Grid size={{ xs: 6, sm: 6, md: 4 }} key={specialty.id}>
                      <Card
                        variant="outlined"
                        sx={{
                          p: 2.5,
                          cursor: 'pointer',
                          textAlign: 'center',
                          borderWidth: isSelected ? 2 : 1,
                          borderColor: isSelected ? 'primary.main' : 'divider',
                          bgcolor: isSelected
                            ? alpha(theme.palette.primary.main, 0.08)
                            : 'transparent',
                          boxShadow: isSelected ? 4 : 0,
                          transition: 'all 0.2s ease',
                          '&:hover': {
                            transform: 'scale(1.02)',
                            borderColor: 'primary.main',
                            bgcolor: alpha(theme.palette.primary.main, 0.04),
                            boxShadow: 2,
                          },
                        }}
                        onClick={() => form.setSelectedSpecialtyId(specialty.id)}
                      >
                        <Box
                          sx={{
                            width: 48,
                            height: 48,
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            bgcolor: alpha(theme.palette.primary.main, 0.12),
                            color: 'primary.main',
                            mx: 'auto',
                            mb: 1.5,
                          }}
                        >
                          <i className="ri-stethoscope-line" style={{ fontSize: 24 }} />
                        </Box>
                        <Typography variant="body2" fontWeight={600}>
                          {specialty.name}
                        </Typography>
                      </Card>
                    </Grid>
                  );
                })}
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

      // ── Step 1: Doctor ──
      case 1:
        return (
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
              Seleccione el doctor
            </Typography>
            {form.loadingDoctors ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {form.doctors.map((doctor, idx) => {
                  const isSelected = form.selectedDoctorId === doctor.id;
                  const avatarColor = AVATAR_COLORS[idx % AVATAR_COLORS.length]!;
                  const initials = `${doctor.profile.name.charAt(0)}${doctor.profile.lastName.charAt(0)}`;
                  return (
                    <Card
                      key={doctor.id}
                      variant="outlined"
                      sx={{
                        p: 2,
                        cursor: 'pointer',
                        borderLeft: isSelected ? `4px solid ${theme.palette.primary.main}` : '4px solid transparent',
                        bgcolor: isSelected
                          ? alpha(theme.palette.primary.main, 0.06)
                          : 'transparent',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          bgcolor: alpha(theme.palette.primary.main, 0.03),
                          borderColor: isSelected ? 'primary.main' : 'divider',
                        },
                      }}
                      onClick={() => form.setSelectedDoctorId(doctor.id)}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar
                          sx={{
                            width: 52,
                            height: 52,
                            bgcolor: alpha(theme.palette[avatarColor].main, 0.15),
                            color: `${avatarColor}.main`,
                            fontWeight: 700,
                            fontSize: '1.1rem',
                          }}
                        >
                          {initials}
                        </Avatar>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="subtitle1" fontWeight={700}>
                            Dr. {doctor.profile.name} {doctor.profile.lastName}
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5, flexWrap: 'wrap', alignItems: 'center' }}>
                            {doctor.specialties.map((sp) => (
                              <Chip
                                key={sp.id}
                                label={sp.name}
                                size="small"
                                variant="outlined"
                                sx={{ fontSize: '0.7rem', height: 22 }}
                              />
                            ))}
                            {doctor.licenseNumber && (
                              <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
                                CMP: {doctor.licenseNumber}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                        {isSelected && (
                          <Box
                            sx={{
                              width: 32,
                              height: 32,
                              borderRadius: '50%',
                              bgcolor: 'primary.main',
                              color: 'primary.contrastText',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <i className="ri-check-line" style={{ fontSize: 18 }} />
                          </Box>
                        )}
                      </Box>
                    </Card>
                  );
                })}
                {form.doctors.length === 0 && (
                  <Typography color="text.secondary" textAlign="center" sx={{ py: 4 }}>
                    No hay doctores disponibles para esta especialidad
                  </Typography>
                )}
              </Box>
            )}
          </Box>
        );

      // ── Step 2: Fecha y Hora ──
      case 2: {
        // Si hay time-slots del nuevo endpoint, usarlos para el grid de horarios.
        // Cada slot tiene { startTime, endTime, available }. Se mapea al scheduleId
        // correspondiente buscando por timeFrom en los schedules ya cargados.
        const useTimeSlotsView = form.timeSlots.length > 0;

        const renderSlotGrid = () => {
          if (form.loadingTimeSlots) {
            return (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                <CircularProgress size={28} />
              </Box>
            );
          }

          if (useTimeSlotsView) {
            return (
              <Box>
                {/* Leyenda */}
                <Box sx={{ display: 'flex', gap: 2, mb: 1.5, alignItems: 'center' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'success.main' }} />
                    <Typography variant="caption" color="text.secondary">Disponible</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'text.disabled' }} />
                    <Typography variant="caption" color="text.secondary">Ocupado</Typography>
                  </Box>
                </Box>

                <Grid container spacing={1}>
                  {form.timeSlots.map((slot) => {
                    // Buscar el schedule correspondiente por timeFrom para obtener el id
                    const matchedSchedule = form.slotsForSelectedDate.find(
                      (s) => s.timeFrom === slot.startTime,
                    );
                    const scheduleId = matchedSchedule?.id ?? null;
                    const isSelected = scheduleId !== null && form.selectedScheduleId === scheduleId;
                    const isOccupied = !slot.available;

                    return (
                      <Grid size={{ xs: 3 }} key={`${slot.startTime}-${slot.endTime}`}>
                        <Button
                          fullWidth
                          variant={isSelected ? 'contained' : 'outlined'}
                          disabled={isOccupied || scheduleId === null}
                          onClick={() => {
                            if (scheduleId !== null) form.setSelectedScheduleId(scheduleId);
                          }}
                          sx={{
                            borderRadius: 2,
                            py: 1,
                            fontWeight: 600,
                            fontSize: '0.8rem',
                            position: 'relative',
                            ...(isOccupied && {
                              borderStyle: 'dashed',
                              color: 'text.disabled',
                              borderColor: 'divider',
                              '&.Mui-disabled': {
                                borderStyle: 'dashed',
                              },
                            }),
                          }}
                        >
                          {slot.startTime}
                        </Button>
                      </Grid>
                    );
                  })}
                </Grid>
              </Box>
            );
          }

          // Fallback: vista anterior (solo schedules disponibles)
          if (form.slotsForSelectedDate.length > 0) {
            return (
              <Grid container spacing={1}>
                {form.slotsForSelectedDate.map((slot) => {
                  const isSelected = form.selectedScheduleId === slot.id;
                  return (
                    <Grid size={{ xs: 3 }} key={slot.id}>
                      <Button
                        fullWidth
                        variant={isSelected ? 'contained' : 'outlined'}
                        onClick={() => form.setSelectedScheduleId(slot.id)}
                        sx={{
                          borderRadius: 2,
                          py: 1,
                          fontWeight: 600,
                          fontSize: '0.85rem',
                        }}
                      >
                        {slot.timeFrom}
                      </Button>
                    </Grid>
                  );
                })}
              </Grid>
            );
          }

          return (
            <Typography color="text.secondary" textAlign="center" sx={{ py: 3 }}>
              No hay horarios disponibles para esta fecha
            </Typography>
          );
        };

        return (
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
              Seleccione fecha y horario
            </Typography>
            {form.loadingSchedules ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : form.availableDates.length > 0 ? (
              <Box>
                {/* Barra horizontal de fechas */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                  <IconButton
                    size="small"
                    onClick={() => scrollDates('left')}
                    sx={{ flexShrink: 0 }}
                  >
                    <i className="ri-arrow-left-s-line" style={{ fontSize: 20 }} />
                  </IconButton>
                  <Box
                    ref={dateScrollRef}
                    sx={{
                      display: 'flex',
                      gap: 1,
                      overflowX: 'auto',
                      flex: 1,
                      py: 0.5,
                      scrollbarWidth: 'none',
                      '&::-webkit-scrollbar': { display: 'none' },
                    }}
                  >
                    {form.availableDates.map((dateStr) => {
                      const { dayName, dayNumber, monthName } = parseDateParts(dateStr);
                      const isSelected = form.selectedDate === dateStr;
                      return (
                        <Box
                          key={dateStr}
                          onClick={() => {
                            form.setSelectedDate(dateStr);
                            form.setSelectedScheduleId(null);
                          }}
                          sx={{
                            minWidth: 64,
                            height: 80,
                            borderRadius: 3,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            border: isSelected ? 'none' : '1px solid',
                            borderColor: 'divider',
                            bgcolor: isSelected ? 'primary.main' : 'transparent',
                            color: isSelected ? 'primary.contrastText' : 'text.primary',
                            transition: 'all 0.2s ease',
                            flexShrink: 0,
                            position: 'relative',
                            '&:hover': {
                              bgcolor: isSelected
                                ? 'primary.dark'
                                : alpha(theme.palette.primary.main, 0.06),
                            },
                          }}
                        >
                          <Typography
                            variant="caption"
                            sx={{
                              fontWeight: 500,
                              opacity: isSelected ? 0.85 : 0.7,
                              textTransform: 'uppercase',
                              fontSize: '0.65rem',
                            }}
                          >
                            {dayName}
                          </Typography>
                          <Typography variant="h6" fontWeight={700} lineHeight={1.2}>
                            {dayNumber}
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{
                              fontWeight: 500,
                              opacity: isSelected ? 0.85 : 0.7,
                              fontSize: '0.65rem',
                            }}
                          >
                            {monthName}
                          </Typography>
                          {/* Dot indicador de disponibilidad */}
                          <Box
                            sx={{
                              width: 5,
                              height: 5,
                              borderRadius: '50%',
                              bgcolor: isSelected ? 'primary.contrastText' : 'success.main',
                              position: 'absolute',
                              bottom: 6,
                            }}
                          />
                        </Box>
                      );
                    })}
                  </Box>
                  <IconButton
                    size="small"
                    onClick={() => scrollDates('right')}
                    sx={{ flexShrink: 0 }}
                  >
                    <i className="ri-arrow-right-s-line" style={{ fontSize: 20 }} />
                  </IconButton>
                </Box>

                {/* Grid de horarios */}
                {form.selectedDate && (
                  <Box>
                    <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1.5 }}>
                      Horarios para {formatDate(form.selectedDate)}
                    </Typography>
                    {renderSlotGrid()}
                  </Box>
                )}
              </Box>
            ) : (
              <Typography color="text.secondary" textAlign="center" sx={{ py: 4 }}>
                No hay horarios disponibles para este doctor
              </Typography>
            )}
          </Box>
        );
      }

      // ── Step 3: Paciente + Resumen ──
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
                      <Avatar
                        sx={{
                          width: 36,
                          height: 36,
                          bgcolor: alpha(theme.palette.success.main, 0.12),
                          color: 'success.main',
                          fontSize: '0.85rem',
                          fontWeight: 600,
                        }}
                      >
                        {patient.profile.name.charAt(0)}{patient.profile.lastName.charAt(0)}
                      </Avatar>
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

            {/* Resumen tipo boarding pass */}
            {form.selectedPatientId && (
              <Card
                variant="outlined"
                sx={{
                  mt: 3,
                  borderRadius: 4,
                  border: `1px solid ${theme.palette.divider}`,
                  overflow: 'hidden',
                }}
              >
                <Box
                  sx={{
                    px: 2.5,
                    py: 1.5,
                    bgcolor: alpha(theme.palette.primary.main, 0.06),
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                  }}
                >
                  <Box
                    sx={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      bgcolor: alpha(theme.palette.primary.main, 0.12),
                      color: 'primary.main',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <i className="ri-check-line" style={{ fontSize: 16 }} />
                  </Box>
                  <Typography variant="subtitle2" fontWeight={700}>
                    Resumen de tu cita
                  </Typography>
                </Box>

                <Divider sx={{ borderStyle: 'dashed' }} />

                <Box sx={{ px: 2.5, py: 2 }}>
                  {[
                    { icon: 'ri-stethoscope-line', label: 'Especialidad', value: form.selectedSpecialty?.name },
                    { icon: 'ri-user-heart-line', label: 'Doctor', value: form.selectedDoctor ? `Dr. ${form.selectedDoctor.profile.name} ${form.selectedDoctor.profile.lastName}` : '' },
                    {
                      icon: 'ri-calendar-line',
                      label: 'Fecha',
                      value: form.selectedSchedule
                        ? formatDate(form.selectedSchedule.scheduleDate.split('T')[0] ?? form.selectedSchedule.scheduleDate)
                        : '',
                    },
                    { icon: 'ri-time-line', label: 'Hora', value: form.selectedSchedule ? `${form.selectedSchedule.timeFrom} - ${form.selectedSchedule.timeTo}` : '' },
                    { icon: 'ri-user-line', label: 'Paciente', value: form.selectedPatient ? `${form.selectedPatient.profile.name} ${form.selectedPatient.profile.lastName}` : '' },
                    ...(form.reason
                      ? [{ icon: 'ri-file-text-line', label: 'Motivo', value: form.reason }]
                      : []),
                  ].map((row, idx, arr) => (
                    <Box key={row.label}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1 }}>
                        <i
                          className={row.icon}
                          style={{
                            fontSize: 18,
                            color: theme.palette.primary.main,
                            opacity: 0.8,
                            width: 20,
                          }}
                        />
                        <Typography variant="caption" color="text.secondary" sx={{ minWidth: 80 }}>
                          {row.label}
                        </Typography>
                        <Typography variant="body2" fontWeight={500} sx={{ flex: 1 }}>
                          {row.value}
                        </Typography>
                      </Box>
                      {idx < arr.length - 1 && (
                        <Divider sx={{ opacity: 0.4 }} />
                      )}
                    </Box>
                  ))}
                </Box>
              </Card>
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
      {/* Header con título + stepper */}
      <Box sx={{ px: 3, pt: 3, pb: 1 }}>
        <Typography variant="h6" fontWeight={700} textAlign="center" sx={{ mb: 2 }}>
          Nueva Cita Médica
        </Typography>
        {renderStepper()}
        {/* Breadcrumb visual */}
        {breadcrumbs.length > 0 && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 0.5,
              mt: 1.5,
              flexWrap: 'wrap',
            }}
          >
            {breadcrumbs.map((crumb, idx) => (
              <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                {idx > 0 && (
                  <i
                    className="ri-arrow-right-s-line"
                    style={{ fontSize: 14, color: theme.palette.text.disabled }}
                  />
                )}
                <Chip
                  label={crumb}
                  size="small"
                  variant="outlined"
                  sx={{
                    fontSize: '0.7rem',
                    height: 24,
                    borderColor: alpha(theme.palette.primary.main, 0.3),
                    color: 'primary.main',
                    bgcolor: alpha(theme.palette.primary.main, 0.04),
                  }}
                />
              </Box>
            ))}
          </Box>
        )}
      </Box>

      <DialogContent sx={{ px: 3, pt: 2 }}>
        {form.error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {form.error}
          </Alert>
        )}
        {renderStepContent()}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
        <Button onClick={onClose} color="inherit" sx={{ mr: 'auto' }}>
          Cancelar
        </Button>
        {form.activeStep > 0 && (
          <Button
            variant="outlined"
            onClick={form.handleBack}
            disabled={form.submitting}
            startIcon={<i className="ri-arrow-left-line" style={{ fontSize: 16 }} />}
          >
            Atrás
          </Button>
        )}
        {isLastStep ? (
          <Button
            variant="contained"
            onClick={form.handleSubmit}
            disabled={!form.canGoNext() || form.submitting}
            endIcon={
              form.submitting ? (
                <CircularProgress size={18} color="inherit" />
              ) : (
                <i className="ri-check-line" style={{ fontSize: 18 }} />
              )
            }
          >
            Confirmar Cita
          </Button>
        ) : (
          <Button
            variant="contained"
            onClick={form.handleNext}
            disabled={!form.canGoNext()}
            endIcon={<i className="ri-arrow-right-line" style={{ fontSize: 18 }} />}
          >
            Siguiente
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
