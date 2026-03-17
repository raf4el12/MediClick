'use client';

import { useState, useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { appointmentsService } from '@/services/appointments.service';
import { clinicalNotesService } from '@/services/clinical-notes.service';
import { prescriptionsService } from '@/services/prescriptions.service';
import type { Appointment } from '@/views/appointments/types';
import { AppointmentStatus } from '@/views/appointments/types';
import type { CreateClinicalNotePayload } from '@/views/clinical-notes/types';
import type { Prescription, CreatePrescriptionPayload } from '@/views/prescriptions/types';

export function useDoctorDashboard() {
  const queryClient = useQueryClient();

  // ── Today's appointments ──
  const {
    data: appointments = [],
    isLoading: loadingAppointments,
    error: appointmentsError,
  } = useQuery({
    queryKey: ['doctor', 'daily-appointments'],
    queryFn: () => appointmentsService.getDoctorDaily(),
    staleTime: 60 * 1000,
    refetchInterval: 2 * 60 * 1000,
  });

  // ── Selected appointment workspace ──
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

  // ── Clinical notes for selected appointment ──
  const {
    data: notes = [],
    isLoading: loadingNotes,
  } = useQuery({
    queryKey: ['clinical-notes', 'appointment', selectedAppointment?.id],
    queryFn: () => clinicalNotesService.getByAppointment(selectedAppointment!.id),
    enabled: selectedAppointment !== null,
    staleTime: 30 * 1000,
  });

  // ── Prescription for selected appointment ──
  const {
    data: prescription,
    isLoading: loadingPrescription,
  } = useQuery<Prescription | null>({
    queryKey: ['prescription', 'appointment', selectedAppointment?.id],
    queryFn: async () => {
      try {
        return await prescriptionsService.getByAppointment(selectedAppointment!.id);
      } catch (err: unknown) {
        const status = (err as { response?: { status?: number } })?.response?.status;
        if (status === 404) return null;
        throw err;
      }
    },
    enabled: selectedAppointment !== null,
    staleTime: 30 * 1000,
  });

  // ── Stats ──
  const stats = useMemo(() => {
    const total = appointments.length;
    const pending = appointments.filter(
      (a) => a.status === AppointmentStatus.PENDING || a.status === AppointmentStatus.CONFIRMED,
    ).length;
    const inProgress = appointments.filter(
      (a) => a.status === AppointmentStatus.IN_PROGRESS,
    ).length;
    const completed = appointments.filter(
      (a) => a.status === AppointmentStatus.COMPLETED,
    ).length;
    const cancelled = appointments.filter(
      (a) => a.status === AppointmentStatus.CANCELLED || a.status === AppointmentStatus.NO_SHOW,
    ).length;

    return { total, pending, inProgress, completed, cancelled };
  }, [appointments]);

  // ── Sorted appointments (by startTime) ──
  const sortedAppointments = useMemo(
    () => [...appointments].sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [appointments],
  );

  // ── Actions ──
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const selectAppointment = useCallback((appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setActionError(null);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedAppointment(null);
    setActionError(null);
  }, []);

  const completeAppointment = useCallback(async (id: number) => {
    setActionLoading(true);
    setActionError(null);
    try {
      const updated = await appointmentsService.complete(id);
      setSelectedAppointment(updated);
      void queryClient.invalidateQueries({ queryKey: ['doctor', 'daily-appointments'] });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setActionError(typeof msg === 'string' ? msg : 'Error al completar la cita');
    } finally {
      setActionLoading(false);
    }
  }, [queryClient]);

  const createNote = useCallback(async (payload: CreateClinicalNotePayload) => {
    setActionLoading(true);
    setActionError(null);
    try {
      await clinicalNotesService.create(payload);
      void queryClient.invalidateQueries({
        queryKey: ['clinical-notes', 'appointment', payload.appointmentId],
      });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setActionError(typeof msg === 'string' ? msg : 'Error al crear la nota clínica');
    } finally {
      setActionLoading(false);
    }
  }, [queryClient]);

  const createPrescription = useCallback(async (payload: CreatePrescriptionPayload) => {
    setActionLoading(true);
    setActionError(null);
    try {
      await prescriptionsService.create(payload);
      void queryClient.invalidateQueries({
        queryKey: ['prescription', 'appointment', payload.appointmentId],
      });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setActionError(typeof msg === 'string' ? msg : 'Error al crear la receta');
    } finally {
      setActionLoading(false);
    }
  }, [queryClient]);

  return {
    appointments: sortedAppointments,
    loadingAppointments,
    appointmentsError: appointmentsError ? 'Error al cargar las citas de hoy' : null,
    stats,
    selectedAppointment,
    selectAppointment,
    clearSelection,
    notes,
    loadingNotes,
    prescription: prescription ?? null,
    loadingPrescription,
    actionLoading,
    actionError,
    completeAppointment,
    createNote,
    createPrescription,
  };
}
