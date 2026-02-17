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
import type { Schedule } from '@/views/schedules/types';
import type { Patient } from '@/views/patients/types';

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

  // Loading states
  const [loadingSpecialties, setLoadingSpecialties] = useState(false);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [loadingSchedules, setLoadingSchedules] = useState(false);
  const [loadingPatients, setLoadingPatients] = useState(false);

  // Selections
  const [selectedSpecialtyId, setSelectedSpecialtyId] = useState<number | null>(null);
  const [selectedDoctorId, setSelectedDoctorId] = useState<number | null>(null);
  const [selectedScheduleId, setSelectedScheduleId] = useState<number | null>(null);
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const [reason, setReason] = useState('');

  // Derived data for summary
  const selectedSpecialty = specialties.find((s) => s.id === selectedSpecialtyId) ?? null;
  const selectedDoctor = doctors.find((d) => d.id === selectedDoctorId) ?? null;
  const selectedSchedule = schedules.find((s) => s.id === selectedScheduleId) ?? null;
  const selectedPatient = patients.find((p) => p.id === selectedPatientId) ?? null;

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

  // Step 2: Load schedules when doctor selected
  useEffect(() => {
    if (!selectedDoctorId || !selectedSpecialtyId) {
      setSchedules([]);
      return;
    }
    setLoadingSchedules(true);
    const today = new Date().toISOString().split('T')[0];
    schedulesService
      .findAllPaginated(
        { pageSize: 100 },
        { doctorId: selectedDoctorId, specialtyId: selectedSpecialtyId, dateFrom: today },
      )
      .then((res) => setSchedules(res.rows))
      .catch(() => setSchedules([]))
      .finally(() => setLoadingSchedules(false));
  }, [selectedDoctorId, selectedSpecialtyId]);

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
    setSpecialties([]);
    setDoctors([]);
    setSchedules([]);
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
    loadingSpecialties,
    loadingDoctors,
    loadingSchedules,
    loadingPatients,
    selectedSpecialtyId,
    selectedDoctorId,
    selectedScheduleId,
    selectedPatientId,
    reason,
    selectedSpecialty,
    selectedDoctor,
    selectedSchedule,
    selectedPatient,
    setSelectedSpecialtyId,
    setSelectedDoctorId,
    setSelectedScheduleId,
    setSelectedPatientId,
    setReason,
    searchPatients,
    canGoNext,
    handleNext,
    handleBack,
    handleSubmit,
  };
}
