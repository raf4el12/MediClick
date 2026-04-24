'use client';

import { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardActionArea from '@mui/material/CardActionArea';
import Button from '@mui/material/Button';
import Stepper from '@mui/material/Stepper';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import Chip from '@mui/material/Chip';
import TextField from '@mui/material/TextField';
import Skeleton from '@mui/material/Skeleton';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import { clinicsService } from '@/services/clinics.service';
import { specialtiesService } from '@/services/specialties.service';
import { doctorsService } from '@/services/doctors.service';
import { schedulesService } from '@/services/schedules.service';
import { appointmentsService } from '@/services/appointments.service';
import { paymentsService } from '@/services/payments.service';
import { filterAvailableSlots } from '@/views/appointments/functions/filterAvailableSlots';
import { getTodayInTimezone } from '@/utils/timezone';
import { extractApiError } from '@/utils/extractApiError';
import type { TimeSlot } from '@/views/schedules/types';

const steps = ['Sede', 'Especialidad', 'Doctor', 'Fecha y Hora', 'Confirmar'];

export default function PatientBookView() {
  const queryClient = useQueryClient();
  const [activeStep, setActiveStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Selections
  const [selectedClinicId, setSelectedClinicId] = useState<number | null>(null);
  const [selectedSpecialtyId, setSelectedSpecialtyId] = useState<number | null>(null);
  const [selectedDoctorId, setSelectedDoctorId] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlotTime, setSelectedSlotTime] = useState<{ scheduleId: number; startTime: string; endTime: string } | null>(null);
  const [reason, setReason] = useState('');

  // ── Clinics ──
  const { data: clinics = [], isLoading: loadingClinics } = useQuery({
    queryKey: ['clinics', 'patient-booking'],
    queryFn: () => clinicsService.findAll(),
    staleTime: 10 * 60 * 1000,
  });

  // ── Specialties ──
  const { data: specialties = [], isLoading: loadingSpecialties } = useQuery({
    queryKey: ['specialties', 'patient-booking'],
    queryFn: () => specialtiesService.findAllPaginated({ pageSize: 100 }).then((r) => r.rows),
    staleTime: 5 * 60 * 1000,
  });

  // ── Doctors by specialty + clinic ──
  const { data: doctors = [], isLoading: loadingDoctors } = useQuery({
    queryKey: ['doctors', 'by-specialty-clinic', selectedSpecialtyId, selectedClinicId],
    queryFn: () =>
      doctorsService
        .findAllPaginated({ pageSize: 100 }, selectedSpecialtyId!, selectedClinicId!)
        .then((r) => r.rows),
    enabled: selectedSpecialtyId !== null && selectedClinicId !== null,
    staleTime: 5 * 60 * 1000,
  });

  // Derived
  const selectedClinic = useMemo(
    () => clinics.find((c) => c.id === selectedClinicId) ?? null,
    [clinics, selectedClinicId],
  );
  const selectedSpecialty = useMemo(
    () => specialties.find((s) => s.id === selectedSpecialtyId) ?? null,
    [specialties, selectedSpecialtyId],
  );
  const selectedDoctor = useMemo(
    () => doctors.find((d) => d.id === selectedDoctorId) ?? null,
    [doctors, selectedDoctorId],
  );

  // ── Schedules ──
  const doctorTimezone = selectedDoctor?.clinic?.timezone ?? 'America/Lima';
  const today = getTodayInTimezone(doctorTimezone);
  const { data: schedules = [], isLoading: loadingSchedules } = useQuery({
    queryKey: ['schedules', 'patient-available', selectedDoctorId, selectedSpecialtyId, today],
    queryFn: () =>
      schedulesService
        .findAllPaginated(
          { pageSize: 200 },
          {
            doctorId: selectedDoctorId!,
            specialtyId: selectedSpecialtyId!,
            dateFrom: today,
            onlyAvailable: true,
          },
        )
        .then((r) => filterAvailableSlots(r.rows, doctorTimezone)),
    enabled: selectedDoctorId !== null && selectedSpecialtyId !== null,
    staleTime: 2 * 60 * 1000,
  });

  const availableDates = useMemo(
    () =>
      Array.from(
        new Set(schedules.map((s) => s.scheduleDate.split('T')[0] ?? s.scheduleDate)),
      ).sort(),
    [schedules],
  );

  // ── Time Slots ──
  const { data: timeSlots = [], isLoading: loadingTimeSlots } = useQuery({
    queryKey: ['time-slots', selectedDoctorId, selectedSpecialtyId, selectedDate],
    queryFn: () =>
      schedulesService.getTimeSlots({
        doctorId: selectedDoctorId!,
        specialtyId: selectedSpecialtyId!,
        date: selectedDate!,
      }),
    enabled:
      selectedDate !== null &&
      selectedDoctorId !== null &&
      selectedSpecialtyId !== null,
    staleTime: 30 * 1000,
  });

  // Auto-select first available date
  useEffect(() => {
    if (availableDates.length > 0 && !selectedDate) {
      setSelectedDate(availableDates[0]!);
    }
  }, [availableDates, selectedDate]);

  // Reset downstream on doctor change
  useEffect(() => {
    setSelectedDate(null);
    setSelectedSlotTime(null);
  }, [selectedDoctorId]);

  const handleSelectClinic = (id: number) => {
    setSelectedClinicId(id);
    setSelectedSpecialtyId(null);
    setSelectedDoctorId(null);
    setSelectedDate(null);
    setSelectedSlotTime(null);
    setActiveStep(1);
  };

  const handleSelectSpecialty = (id: number) => {
    setSelectedSpecialtyId(id);
    setSelectedDoctorId(null);
    setSelectedDate(null);
    setSelectedSlotTime(null);
    setActiveStep(2);
  };

  const handleSelectDoctor = (id: number) => {
    setSelectedDoctorId(id);
    setSelectedDate(null);
    setSelectedSlotTime(null);
    setActiveStep(3);
  };

  const handleSelectSlot = (slot: TimeSlot) => {
    if (!slot.available) return;
    setSelectedSlotTime({ scheduleId: slot.scheduleId, startTime: slot.startTime, endTime: slot.endTime });
  };

  const handleBack = () => {
    setError(null);
    if (activeStep === 1) {
      setSelectedSpecialtyId(null);
    } else if (activeStep === 2) {
      setSelectedDoctorId(null);
      setSelectedDate(null);
      setSelectedSlotTime(null);
    } else if (activeStep === 3) {
      setSelectedDate(null);
      setSelectedSlotTime(null);
    } else if (activeStep === 4) {
      setSelectedSlotTime(null);
    }
    setActiveStep((p) => Math.max(0, p - 1));
  };

  const handleNext = () => {
    if (activeStep === 3 && selectedSlotTime) {
      setActiveStep(4);
    }
  };

  const handleSubmit = async () => {
    if (!selectedSlotTime || !selectedSpecialtyId || !selectedDoctorId) return;

    setSubmitting(true);
    setError(null);
    try {
      const appointment = await appointmentsService.createAsPatient({
        scheduleId: selectedSlotTime.scheduleId,
        startTime: selectedSlotTime.startTime,
        endTime: selectedSlotTime.endTime,
        reason: reason || undefined,
      });

      setRedirecting(true);
      const preference = await paymentsService.createPreference(appointment.id);
      window.location.href = preference.initPoint;
    } catch (err: unknown) {
      const { message: errorMsg, status } = extractApiError(err, 'Error al reservar la cita');

      if (status === 409) {
        setSelectedSlotTime(null);
        await queryClient.invalidateQueries({ queryKey: ['time-slots', selectedDoctorId, selectedSpecialtyId, selectedDate] });
        setActiveStep(3);
        setError('El horario seleccionado ya fue reservado. Por favor selecciona otro horario disponible.');
      } else {
        setError(errorMsg);
      }
      setRedirecting(false);
    } finally {
      setSubmitting(false);
    }
  };

  if (redirecting) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, py: 8 }}>
        <CircularProgress size={48} />
        <Typography variant="h6" fontWeight={600} textAlign="center">
          Redirigiendo a Mercado Pago…
        </Typography>
        <Typography variant="body2" color="text.secondary" textAlign="center">
          Tu cita fue reservada. Te estamos llevando al checkout seguro para
          completar el pago.
        </Typography>
      </Box>
    );
  }


  return (
    <Box>
      {/* Stepper */}
      <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 3 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Step 0: Select Clinic/Sede */}
      {activeStep === 0 && (
        <Box>
          <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
            Selecciona una sede
          </Typography>
          {loadingClinics ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {[1, 2, 3].map((i) => <Skeleton key={i} variant="rounded" height={80} />)}
            </Box>
          ) : clinics.length === 0 ? (
            <Alert severity="info">No hay sedes disponibles en este momento.</Alert>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {clinics.filter((c) => c.isActive).map((clinic) => (
                <Card
                  key={clinic.id}
                  variant="outlined"
                  sx={{
                    borderRadius: 2,
                    borderColor: selectedClinicId === clinic.id ? 'primary.main' : undefined,
                    borderWidth: selectedClinicId === clinic.id ? 2 : 1,
                  }}
                >
                  <CardActionArea onClick={() => handleSelectClinic(clinic.id)}>
                    <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 1.5 }}>
                      <Box
                        sx={{
                          width: 44,
                          height: 44,
                          borderRadius: 2,
                          bgcolor: 'primary.lighter',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <i className="ri-hospital-line" style={{ fontSize: 22, color: 'var(--mui-palette-primary-main)' }} />
                      </Box>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="subtitle2" fontWeight={600} noWrap>
                          {clinic.name}
                        </Typography>
                        {clinic.address && (
                          <Typography variant="caption" color="text.secondary" noWrap>
                            <i className="ri-map-pin-line" style={{ fontSize: 12, marginRight: 4 }} />
                            {clinic.address}
                          </Typography>
                        )}
                      </Box>
                    </CardContent>
                  </CardActionArea>
                </Card>
              ))}
            </Box>
          )}
        </Box>
      )}

      {/* Step 1: Select Specialty */}
      {activeStep === 1 && (
        <Box>
          <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
            Selecciona una especialidad
          </Typography>
          {loadingSpecialties ? (
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
              {[1, 2, 3, 4].map((i) => <Skeleton key={i} variant="rounded" height={70} />)}
            </Box>
          ) : (
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
              {specialties.filter((s) => s.isActive).map((spec) => (
                <Card
                  key={spec.id}
                  variant="outlined"
                  sx={{
                    borderRadius: 2,
                    borderColor: selectedSpecialtyId === spec.id ? 'primary.main' : undefined,
                    borderWidth: selectedSpecialtyId === spec.id ? 2 : 1,
                  }}
                >
                  <CardActionArea onClick={() => handleSelectSpecialty(spec.id)}>
                    <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 1.5 }}>
                      <Box
                        sx={{
                          width: 40,
                          height: 40,
                          borderRadius: 2,
                          bgcolor: 'primary.lighter',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <i className={spec.icon || 'ri-stethoscope-line'} style={{ fontSize: 20, color: 'var(--mui-palette-primary-main)' }} />
                      </Box>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="subtitle2" fontWeight={600} noWrap>
                          {spec.name}
                        </Typography>
                        {spec.duration && (
                          <Typography variant="caption" color="text.secondary">
                            {spec.duration} min
                          </Typography>
                        )}
                      </Box>
                    </CardContent>
                  </CardActionArea>
                </Card>
              ))}
            </Box>
          )}
          <Button sx={{ mt: 2 }} onClick={handleBack} startIcon={<i className="ri-arrow-left-line" />}>
            Volver
          </Button>
        </Box>
      )}

      {/* Step 2: Select Doctor */}
      {activeStep === 2 && (
        <Box>
          <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
            Selecciona un doctor
          </Typography>
          {loadingDoctors ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {[1, 2, 3].map((i) => <Skeleton key={i} variant="rounded" height={70} />)}
            </Box>
          ) : doctors.length === 0 ? (
            <Alert severity="info">No hay doctores disponibles para esta especialidad en la sede seleccionada.</Alert>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {doctors.filter((d) => d.isActive).map((doc) => (
                <Card
                  key={doc.id}
                  variant="outlined"
                  sx={{
                    borderRadius: 2,
                    borderColor: selectedDoctorId === doc.id ? 'primary.main' : undefined,
                    borderWidth: selectedDoctorId === doc.id ? 2 : 1,
                  }}
                >
                  <CardActionArea onClick={() => handleSelectDoctor(doc.id)}>
                    <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 1.5 }}>
                      <Box
                        sx={{
                          width: 44,
                          height: 44,
                          borderRadius: '50%',
                          bgcolor: 'primary.lighter',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <i className="ri-user-heart-line" style={{ fontSize: 22, color: 'var(--mui-palette-primary-main)' }} />
                      </Box>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="subtitle2" fontWeight={600} noWrap>
                          Dr. {doc.profile.name} {doc.profile.lastName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          CMP: {doc.licenseNumber}
                        </Typography>
                      </Box>
                    </CardContent>
                  </CardActionArea>
                </Card>
              ))}
            </Box>
          )}
          <Button sx={{ mt: 2 }} onClick={handleBack} startIcon={<i className="ri-arrow-left-line" />}>
            Volver
          </Button>
        </Box>
      )}

      {/* Step 3: Select Date & Time */}
      {activeStep === 3 && (
        <Box>
          <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
            Selecciona fecha y hora
          </Typography>

          {loadingSchedules ? (
            <Skeleton variant="rounded" height={200} />
          ) : availableDates.length === 0 ? (
            <Alert severity="info">No hay horarios disponibles para este doctor.</Alert>
          ) : (
            <>
              {/* Date chips */}
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Fechas disponibles
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 3 }}>
                {availableDates.map((dateStr) => {
                  const d = new Date(dateStr + 'T12:00:00Z');
                  return (
                    <Chip
                      key={dateStr}
                      label={d.toLocaleDateString('es-PE', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                        timeZone: 'UTC',
                      })}
                      onClick={() => { setSelectedDate(dateStr); setSelectedSlotTime(null); }}
                      color={selectedDate === dateStr ? 'primary' : 'default'}
                      variant={selectedDate === dateStr ? 'filled' : 'outlined'}
                    />
                  );
                })}
              </Box>

              {/* Time Slots */}
              {selectedDate && (
                <>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Horarios disponibles
                  </Typography>
                  {loadingTimeSlots ? (
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} variant="rounded" width={90} height={36} />)}
                    </Box>
                  ) : timeSlots.length === 0 ? (
                    <Alert severity="info" sx={{ borderRadius: 2 }}>
                      No hay horarios para esta fecha.
                    </Alert>
                  ) : (
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      {timeSlots.map((slot) => {
                        const isSelected =
                          selectedSlotTime?.startTime === slot.startTime &&
                          selectedSlotTime?.endTime === slot.endTime;
                        return (
                          <Chip
                            key={`${slot.startTime}-${slot.endTime}`}
                            label={`${slot.startTime} - ${slot.endTime}`}
                            onClick={() => slot.available && handleSelectSlot(slot)}
                            color={isSelected ? 'primary' : 'default'}
                            variant={isSelected ? 'filled' : 'outlined'}
                            disabled={!slot.available}
                            sx={{ opacity: slot.available ? 1 : 0.4 }}
                          />
                        );
                      })}
                    </Box>
                  )}
                </>
              )}
            </>
          )}

          <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
            <Button onClick={handleBack} startIcon={<i className="ri-arrow-left-line" />}>
              Volver
            </Button>
            <Button
              variant="contained"
              disabled={!selectedSlotTime}
              onClick={handleNext}
              endIcon={<i className="ri-arrow-right-line" />}
            >
              Continuar
            </Button>
          </Box>
        </Box>
      )}

      {/* Step 4: Confirm */}
      {activeStep === 4 && (
        <Box>
          <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
            Confirma tu cita
          </Typography>

          <Card variant="outlined" sx={{ borderRadius: 2, mb: 3 }}>
            <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box>
                <Typography variant="caption" color="text.secondary">Sede</Typography>
                <Typography variant="body1" fontWeight={500}>
                  {selectedClinic?.name}
                </Typography>
                {selectedClinic?.address && (
                  <Typography variant="caption" color="text.secondary">
                    <i className="ri-map-pin-line" style={{ fontSize: 12, marginRight: 4 }} />
                    {selectedClinic.address}
                  </Typography>
                )}
              </Box>
              <Divider />
              <Box>
                <Typography variant="caption" color="text.secondary">Especialidad</Typography>
                <Typography variant="body1" fontWeight={500}>
                  {selectedSpecialty?.name}
                </Typography>
              </Box>
              <Divider />
              <Box>
                <Typography variant="caption" color="text.secondary">Doctor</Typography>
                <Typography variant="body1" fontWeight={500}>
                  Dr. {selectedDoctor?.profile.name} {selectedDoctor?.profile.lastName}
                </Typography>
              </Box>
              <Divider />
              <Box>
                <Typography variant="caption" color="text.secondary">Fecha</Typography>
                <Typography variant="body1" fontWeight={500}>
                  {selectedDate && new Date(selectedDate + 'T12:00:00Z').toLocaleDateString('es-PE', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    timeZone: 'UTC',
                  })}
                </Typography>
              </Box>
              <Divider />
              <Box>
                <Typography variant="caption" color="text.secondary">Hora</Typography>
                <Typography variant="body1" fontWeight={500}>
                  {selectedSlotTime?.startTime} - {selectedSlotTime?.endTime}
                </Typography>
              </Box>
              {selectedSpecialty?.price != null && (
                <>
                  <Divider />
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <Typography variant="caption" color="text.secondary">
                      Total a pagar
                    </Typography>
                    <Typography variant="h6" fontWeight={700} color="primary.main">
                      S/ {selectedSpecialty.price.toFixed(2)}
                    </Typography>
                  </Box>
                </>
              )}
            </CardContent>
          </Card>

          <Alert severity="info" icon={<i className="ri-shield-check-line" />} sx={{ mb: 2, borderRadius: 2 }}>
            Al confirmar serás redirigido a <b>Mercado Pago</b> para completar el
            pago. Si no lo completas dentro de 15 minutos, la reserva se cancela
            automáticamente.
          </Alert>

          <TextField
            fullWidth
            multiline
            rows={2}
            label="Motivo de consulta (opcional)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            sx={{ mb: 3 }}
          />

          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button onClick={handleBack} startIcon={<i className="ri-arrow-left-line" />}>
              Volver
            </Button>
            <Button
              variant="contained"
              onClick={handleSubmit}
              disabled={submitting}
              startIcon={submitting ? <CircularProgress size={18} /> : <i className="ri-bank-card-line" />}
            >
              {submitting ? 'Reservando…' : 'Reservar y pagar'}
            </Button>
          </Box>
        </Box>
      )}
    </Box>
  );
}
