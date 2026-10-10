'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { appointmentsService } from '@/services/appointments.service';
import { clinicalNotesService } from '@/services/clinical-notes.service';
import { prescriptionsService } from '@/services/prescriptions.service';
import { extractApiError } from '@/utils/extractApiError';
import type { AppointmentStatus } from '@/views/appointments/types';
import type { CreateClinicalNotePayload } from '@/views/clinical-notes/types';
import type { CreatePrescriptionPayload, Prescription } from '@/views/prescriptions/types';

type StatusAction = 'checkIn' | 'noShow' | 'complete';

const RUN: Record<StatusAction, (id: number) => ReturnType<typeof appointmentsService.complete>> = {
  checkIn: appointmentsService.checkIn,
  noShow: appointmentsService.noShow,
  complete: appointmentsService.complete,
};

/**
 * Notas, receta, motivo y acciones de la cita abierta en el espacio de atención. `currentStatus`
 * es el estado que trae la agenda; el devuelto por la última acción vale hasta que la agenda cambia.
 */
export function useAtencion(appointmentId: number, currentStatus: AppointmentStatus) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<{ id: number; message: string } | null>(null);
  const [lastStatus, setLastStatus] = useState<{ id: number; from: AppointmentStatus; status: AppointmentStatus } | null>(null);

  const notes = useQuery({
    queryKey: ['clinical-notes', 'appointment', appointmentId],
    queryFn: () => clinicalNotesService.getByAppointment(appointmentId),
    staleTime: 30_000,
  });

  const prescription = useQuery<Prescription | null>({
    queryKey: ['prescription', 'appointment', appointmentId],
    queryFn: async () => {
      try {
        return await prescriptionsService.getByAppointment(appointmentId);
      } catch (err) {
        if (extractApiError(err).status === 404) return null;
        throw err;
      }
    },
    staleTime: 30_000,
  });

  // `GET /agenda` no trae el motivo; la lista diaria del médico sí.
  const daily = useQuery({
    queryKey: ['doctor', 'daily-appointments'],
    queryFn: appointmentsService.getDoctorDaily,
    staleTime: 60_000,
  });

  const fail = (fallback: string) => (err: unknown) => setError({ id: appointmentId, message: extractApiError(err, fallback).message });

  const statusAction = useMutation({
    mutationFn: ({ action }: { action: StatusAction; from: AppointmentStatus }) => RUN[action](appointmentId),
    onMutate: () => setError(null),
    onSuccess: (updated, { from }) => {
      setLastStatus({ id: appointmentId, from, status: updated.status });
      void queryClient.invalidateQueries({ queryKey: ['agenda'] });
      void queryClient.invalidateQueries({ queryKey: ['doctor', 'daily-appointments'] });
    },
    onError: fail('No se pudo actualizar la cita'),
  });

  const createNote = useMutation({
    mutationFn: (payload: CreateClinicalNotePayload) => clinicalNotesService.create(payload),
    onMutate: () => setError(null),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['clinical-notes', 'appointment', appointmentId] }),
    onError: fail('No se pudo guardar la nota clínica'),
  });

  const createPrescription = useMutation({
    mutationFn: (payload: CreatePrescriptionPayload) => prescriptionsService.create(payload),
    onMutate: () => setError(null),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['prescription', 'appointment', appointmentId] }),
    onError: fail('No se pudo guardar la receta'),
  });

  return {
    reason: daily.data?.find((a) => a.id === appointmentId)?.reason ?? null,
    notes: notes.data ?? [],
    loadingNotes: notes.isLoading,
    prescription: prescription.data ?? null,
    loadingPrescription: prescription.isLoading,
    status: lastStatus?.id === appointmentId && lastStatus.from === currentStatus ? lastStatus.status : currentStatus,
    error: error?.id === appointmentId ? error.message : null,
    busy: statusAction.isPending || createNote.isPending || createPrescription.isPending,
    run: (action: StatusAction) => statusAction.mutate({ action, from: currentStatus }),
    createNote: (payload: CreateClinicalNotePayload) => createNote.mutateAsync(payload),
    createPrescription: (payload: CreatePrescriptionPayload) => createPrescription.mutateAsync(payload),
  };
}
