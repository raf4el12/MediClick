'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAppDispatch } from '@/redux-store/hooks';
import { specialtiesService } from '@/services/specialties.service';
import { doctorsService } from '@/services/doctors.service';
import { schedulesService } from '@/services/schedules.service';
import { patientsService } from '@/services/patients.service';
import { createAppointmentThunk } from '@/redux-store/thunks/appointments.thunks';
import type { Patient } from '@/views/patients/types';
import { filterAvailableSlots } from '../functions/filterAvailableSlots';
import { getTodayInTimezone } from '@/utils/timezone';

interface UseAppointmentFormProps {
  open: boolean;
  onSuccess: () => void;
  onClose: () => void;
}

export function useAppointmentForm({ open, onSuccess, onClose }: UseAppointmentFormProps) {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();

  const [activeStep, setActiveStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Patient search (mantiene estado manual por ser on-demand)
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loadingPatients, setLoadingPatients] = useState(false);

  // Selections
  const [selectedSpecialtyId, setSelectedSpecialtyId] = useState<number | null>(null);
  const [selectedDoctorId, setSelectedDoctorId] = useState<number | null>(null);
  const [selectedScheduleId, setSelectedScheduleId] = useState<number | null>(null);
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const [reason, setReason] = useState('');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlotTime, setSelectedSlotTime] = useState<{ startTime: string; endTime: string } | null>(null);

  // ── React Query: Specialties (se cachean 5 min) ──
  const {
    data: specialties = [],
    isLoading: loadingSpecialties,
  } = useQuery({
    queryKey: ['specialties', 'appointment-form'],
    queryFn: () => specialtiesService.findAllPaginated({ pageSize: 100 }).then((res) => res.rows),
    enabled: open,
    staleTime: 5 * 60 * 1000,
  });

  // ── React Query: Doctors por specialty (se cachean por specialtyId) ──
  const {
    data: doctors = [],
    isLoading: loadingDoctors,
  } = useQuery({
    queryKey: ['doctors', 'by-specialty', selectedSpecialtyId],
    queryFn: () => doctorsService.findAllPaginated({ pageSize: 100 }, selectedSpecialtyId!).then((res) => res.rows),
    enabled: open && selectedSpecialtyId !== null,
    staleTime: 5 * 60 * 1000,
  });

  // Index maps for O(1) lookups (doctorMap antes de schedules para resolver timezone)
  const specialtyMap = useMemo(() => new Map(specialties.map((s) => [s.id, s])), [specialties]);
  const doctorMap = useMemo(() => new Map(doctors.map((d) => [d.id, d])), [doctors]);

  // Derived: doctor seleccionado (necesario para timezone antes del query de schedules)
  const selectedSpecialty = useMemo(() => specialtyMap.get(selectedSpecialtyId!) ?? null, [specialtyMap, selectedSpecialtyId]);
  const selectedDoctor = useMemo(() => doctorMap.get(selectedDoctorId!) ?? null, [doctorMap, selectedDoctorId]);

  // ── React Query: Schedules por doctor + specialty ──
  const doctorTimezone = selectedDoctor?.clinic?.timezone ?? 'America/Lima';
  const today = getTodayInTimezone(doctorTimezone);
  const {
    data: schedules = [],
    isLoading: loadingSchedules,
  } = useQuery({
    queryKey: ['schedules', 'available', selectedDoctorId, selectedSpecialtyId, today],
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
        .then((res) => filterAvailableSlots(res.rows, doctorTimezone)),
    enabled: open && selectedDoctorId !== null && selectedSpecialtyId !== null,
    staleTime: 2 * 60 * 1000,
  });

  // Remaining index maps (depend on schedules/patients data)
  const scheduleMap = useMemo(() => new Map(schedules.map((s) => [s.id, s])), [schedules]);
  const patientMap = useMemo(() => new Map(patients.map((p) => [p.id, p])), [patients]);

  // Derived data for summary
  const selectedSchedule = useMemo(() => scheduleMap.get(selectedScheduleId!) ?? null, [scheduleMap, selectedScheduleId]);
  const selectedPatient = useMemo(() => patientMap.get(selectedPatientId!) ?? null, [patientMap, selectedPatientId]);

  // Computed: unique available dates from schedules
  const availableDates = useMemo(
    () =>
      Array.from(
        new Set(schedules.map((s) => s.scheduleDate.split('T')[0] ?? s.scheduleDate)),
      ).sort(),
    [schedules],
  );

  // Computed: schedules filtered by selected date
  const slotsForSelectedDate = selectedDate
    ? schedules.filter((s) => (s.scheduleDate.split('T')[0] ?? s.scheduleDate) === selectedDate)
    : [];

  // ── React Query: Time slots por fecha seleccionada ──
  const {
    data: timeSlots = [],
    isLoading: loadingTimeSlots,
  } = useQuery({
    queryKey: ['time-slots', selectedDoctorId, selectedSpecialtyId, selectedDate],
    queryFn: () =>
      schedulesService.getTimeSlots({
        doctorId: selectedDoctorId!,
        specialtyId: selectedSpecialtyId!,
        date: selectedDate!,
      }),
    enabled:
      open &&
      selectedDate !== null &&
      selectedDoctorId !== null &&
      selectedSpecialtyId !== null,
    staleTime: 30 * 1000,
  });

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
    if (!selectedPatientId || !selectedScheduleId || !selectedSlotTime) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await dispatch(
        createAppointmentThunk({
          patientId: selectedPatientId,
          scheduleId: selectedScheduleId,
          startTime: selectedSlotTime.startTime,
          endTime: selectedSlotTime.endTime,
          reason: reason || undefined,
        }),
      ).unwrap();
      if (result) {
        onSuccess();
        onClose();
      }
    } catch (err: unknown) {
      const { message, status } = (await import('@/utils/extractApiError')).extractApiError(err, 'Error al crear la cita');
      const isConflict = status === 409 || message.toLowerCase().includes('superpone');

      if (isConflict) {
        setSelectedScheduleId(null);
        setSelectedSlotTime(null);
        void queryClient.invalidateQueries({ queryKey: ['time-slots', selectedDoctorId, selectedSpecialtyId, selectedDate] });
        setActiveStep(2);
        setError('El horario seleccionado ya fue reservado. Selecciona otro horario disponible.');
      } else {
        setError(message);
      }
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
    setSelectedSlotTime(null);
    setReason('');
    setSelectedDate(null);
    setPatients([]);
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
    setSelectedSlotTime,
    setSelectedDate,
    setReason,
    searchPatients,
    canGoNext,
    handleNext,
    handleBack,
    handleSubmit,
  };
}
