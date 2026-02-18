'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAppDispatch } from '@/redux-store/hooks';
import { specialtiesService } from '@/services/specialties.service';
import { doctorsService } from '@/services/doctors.service';
import { schedulesService } from '@/services/schedules.service';
import { patientsService } from '@/services/patients.service';
import { createAppointmentThunk } from '@/redux-store/thunks/appointments.thunks';
import type { Specialty } from '@/views/specialties/types';
import type { Doctor } from '@/views/doctors/types';
import type { Schedule, TimeSlot } from '@/views/schedules/types';
import type { Patient } from '@/views/patients/types';
import { filterAvailableSlots } from '../functions/filterAvailableSlots';

interface UseAppointmentFormProps {
  open: boolean;
  onSuccess: () => void;
  onClose: () => void;
}

export function useAppointmentForm({ open, onSuccess, onClose }: UseAppointmentFormProps) {
  const dispatch = useAppDispatch();

  const [activeStep, setActiveStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Data lists
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);

  // Time slots del nuevo endpoint (disponibles + ocupados)
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);

  // Loading states
  const [loadingSpecialties, setLoadingSpecialties] = useState(false);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [loadingSchedules, setLoadingSchedules] = useState(false);
  const [loadingPatients, setLoadingPatients] = useState(false);
  const [loadingTimeSlots, setLoadingTimeSlots] = useState(false);

  // Selections
  const [selectedSpecialtyId, setSelectedSpecialtyId] = useState<number | null>(null);
  const [selectedDoctorId, setSelectedDoctorId] = useState<number | null>(null);
  const [selectedScheduleId, setSelectedScheduleId] = useState<number | null>(null);
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const [reason, setReason] = useState('');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Derived data for summary
  const selectedSpecialty = specialties.find((s) => s.id === selectedSpecialtyId) ?? null;
  const selectedDoctor = doctors.find((d) => d.id === selectedDoctorId) ?? null;
  const selectedSchedule = schedules.find((s) => s.id === selectedScheduleId) ?? null;
  const selectedPatient = patients.find((p) => p.id === selectedPatientId) ?? null;

  // Computed: unique available dates from schedules
  const availableDates = Array.from(
    new Set(schedules.map((s) => s.scheduleDate.split('T')[0] ?? s.scheduleDate)),
  ).sort();

  // Computed: schedules filtered by selected date (para mapeo scheduleId ↔ timeFrom)
  const slotsForSelectedDate = selectedDate
    ? schedules.filter((s) => (s.scheduleDate.split('T')[0] ?? s.scheduleDate) === selectedDate)
    : [];

  // Step 0: Load specialties when dialog opens
  useEffect(() => {
    if (!open) return;
    setLoadingSpecialties(true);
    specialtiesService
      .findAllPaginated({ pageSize: 100 })
      .then((res) => setSpecialties(res.rows))
      .catch(() => setSpecialties([]))
      .finally(() => setLoadingSpecialties(false));
  }, [open]);

  // Step 1: Load doctors when specialty selected
  useEffect(() => {
    if (!selectedSpecialtyId) {
      setDoctors([]);
      return;
    }
    setLoadingDoctors(true);
    doctorsService
      .findAllPaginated({ pageSize: 100 }, selectedSpecialtyId)
      .then((res) => setDoctors(res.rows))
      .catch(() => setDoctors([]))
      .finally(() => setLoadingDoctors(false));
  }, [selectedSpecialtyId]);

  // Step 2: Load schedules when doctor selected (solo disponibles, sin fechas pasadas)
  useEffect(() => {
    if (!selectedDoctorId || !selectedSpecialtyId) {
      setSchedules([]);
      return;
    }
    setLoadingSchedules(true);
    const nowPeru = new Date(
      new Date().toLocaleString('en-US', { timeZone: 'America/Lima' }),
    );
    const y = nowPeru.getFullYear();
    const m = (nowPeru.getMonth() + 1).toString().padStart(2, '0');
    const d = nowPeru.getDate().toString().padStart(2, '0');
    const today = `${y}-${m}-${d}`;

    schedulesService
      .findAllPaginated(
        { pageSize: 200 },
        {
          doctorId: selectedDoctorId,
          specialtyId: selectedSpecialtyId,
          dateFrom: today,
          onlyAvailable: true,
        },
      )
      .then((res) => setSchedules(filterAvailableSlots(res.rows)))
      .catch(() => setSchedules([]))
      .finally(() => setLoadingSchedules(false));
  }, [selectedDoctorId, selectedSpecialtyId]);

  // Step 2: Cargar time-slots del nuevo endpoint cuando se selecciona una fecha.
  // Se ejecuta solo si la especialidad tiene duración configurada.
  // Los schedules son accedidos desde el closure; dado que selectedDate siempre
  // cambia DESPUÉS de que schedules se actualiza, el valor es fresco.
  useEffect(() => {
    const duration = selectedSpecialty?.duration;

    if (!selectedDate || !selectedDoctorId || !selectedSpecialtyId || !duration) {
      setTimeSlots([]);
      return;
    }

    // Derivar rango del turno desde los schedules disponibles de esa fecha
    const daySchedules = schedules.filter(
      (s) => (s.scheduleDate.split('T')[0] ?? s.scheduleDate) === selectedDate,
    );

    if (daySchedules.length === 0) {
      setTimeSlots([]);
      return;
    }

    const sorted = [...daySchedules].sort((a, b) => a.timeFrom.localeCompare(b.timeFrom));
    const shiftStart = sorted[0]!.timeFrom;
    const shiftEnd = sorted[sorted.length - 1]!.timeTo;

    setLoadingTimeSlots(true);
    schedulesService
      .getTimeSlots({
        doctorId: selectedDoctorId,
        specialtyId: selectedSpecialtyId,
        date: selectedDate,
        timeFrom: shiftStart,
        timeTo: shiftEnd,
        durationMinutes: duration,
      })
      .then(setTimeSlots)
      .catch(() => setTimeSlots([]))
      // eslint-disable-next-line @typescript-eslint/no-confusing-void-expression
      .finally(() => setLoadingTimeSlots(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, selectedDoctorId, selectedSpecialtyId, selectedSpecialty?.duration]);
  // `schedules` se omite intencionalmente de las deps: selectedDate siempre
  // se actualiza después de que schedules carga, por lo que el closure es fresco.

  // Auto-select first available date when schedules load
  useEffect(() => {
    if (availableDates.length > 0) {
      setSelectedDate(availableDates[0]!);
    } else {
      setSelectedDate(null);
    }
  }, [availableDates.join(',')]);

  // Reset selectedDate y timeSlots when doctor changes
  useEffect(() => {
    setSelectedDate(null);
    setSelectedScheduleId(null);
    setTimeSlots([]);
  }, [selectedDoctorId]);

  const searchPatients = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setPatients([]);
      return;
    }
    setLoadingPatients(true);
    try {
      const res = await patientsService.findAllPaginated({
        searchValue: query,
        pageSize: 10,
      });
      setPatients(res.rows);
    } catch {
      setPatients([]);
    } finally {
      setLoadingPatients(false);
    }
  }, []);

  const canGoNext = (): boolean => {
    switch (activeStep) {
      case 0:
        return selectedSpecialtyId !== null;
      case 1:
        return selectedDoctorId !== null;
      case 2:
        return selectedScheduleId !== null;
      case 3:
        return selectedPatientId !== null;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (activeStep < 3) {
      setActiveStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (activeStep > 0) {
      setActiveStep((prev) => prev - 1);
      // Reset downstream selections
      if (activeStep === 1) {
        setSelectedDoctorId(null);
        setSelectedScheduleId(null);
        setSelectedPatientId(null);
      } else if (activeStep === 2) {
        setSelectedScheduleId(null);
        setSelectedPatientId(null);
      } else if (activeStep === 3) {
        setSelectedPatientId(null);
      }
    }
  };

  const handleSubmit = async () => {
    if (!selectedPatientId || !selectedScheduleId) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await dispatch(
        createAppointmentThunk({
          patientId: selectedPatientId,
          scheduleId: selectedScheduleId,
          reason: reason || undefined,
        }),
      ).unwrap();
      if (result) {
        onSuccess();
        onClose();
      }
    } catch (err) {
      setError(typeof err === 'string' ? err : 'Error al crear la cita');
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    setActiveStep(0);
    setSelectedSpecialtyId(null);
    setSelectedDoctorId(null);
    setSelectedScheduleId(null);
    setSelectedPatientId(null);
    setReason('');
    setSelectedDate(null);
    setSpecialties([]);
    setDoctors([]);
    setSchedules([]);
    setPatients([]);
    setTimeSlots([]);
    setError(null);
    setSubmitting(false);
  };

  // Reset on close
  useEffect(() => {
    if (!open) reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return {
    activeStep,
    submitting,
    error,
    specialties,
    doctors,
    schedules,
    patients,
    timeSlots,
    loadingSpecialties,
    loadingDoctors,
    loadingSchedules,
    loadingPatients,
    loadingTimeSlots,
    selectedSpecialtyId,
    selectedDoctorId,
    selectedScheduleId,
    selectedPatientId,
    reason,
    selectedSpecialty,
    selectedDoctor,
    selectedSchedule,
    selectedPatient,
    selectedDate,
    availableDates,
    slotsForSelectedDate,
    setSelectedSpecialtyId,
    setSelectedDoctorId,
    setSelectedScheduleId,
    setSelectedPatientId,
    setSelectedDate,
    setReason,
    searchPatients,
    canGoNext,
    handleNext,
    handleBack,
    handleSubmit,
  };
}
