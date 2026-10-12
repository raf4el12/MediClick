'use client';

import { useEffect, useState, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';
import { appointmentsService } from '@/services/appointments.service';
import { clinicalNotesService } from '@/services/clinical-notes.service';
import type { PaginatedResponse } from '@/types/pagination.types';
import { extractApiError } from '@/utils/extractApiError';
import type { Appointment, AppointmentFilters } from '@/views/appointments/types';
import { useSelectedAppointmentId } from '@/views/clinical-shared/hooks/useSelectedAppointmentId';
import type { CreateClinicalNotePayload } from '../types';

const DEFAULT_PAGINATION = {
  searchValue: '',
  currentPage: 1,
  pageSize: 8,
  orderBy: 'id',
  orderByMode: 'desc' as 'asc' | 'desc',
  totalPages: 1,
};

const DEFAULT_DATA: PaginatedResponse<Appointment> = {
  totalRows: 0,
  rows: [],
  totalPages: 1,
  currentPage: 1,
};

export function useClinicalNotes() {
  const queryClient = useQueryClient();
  const [data, setData] = useState<PaginatedResponse<Appointment>>(DEFAULT_DATA);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [pagination, setPagination] = useState(DEFAULT_PAGINATION);
  const [filters, setFilters] = useState<AppointmentFilters>({});

  // La cita abierta vive en la URL; se recuerda la fila elegida por si cambia la página de la tabla.
  const { selectedId, select, clear } = useSelectedAppointmentId();
  const [chosen, setChosen] = useState<Appointment | null>(null);
  const selectedAppointment = data.rows.find((a) => a.id === selectedId) ?? (chosen?.id === selectedId ? chosen : null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await appointmentsService.findAllPaginated(
        {
          searchValue: pagination.searchValue || undefined,
          currentPage: pagination.currentPage,
          pageSize: pagination.pageSize,
          orderBy: pagination.orderBy,
          orderByMode: pagination.orderByMode,
        },
        filters,
      );
      setData(result);
      setPagination((prev) => ({ ...prev, totalPages: result.totalPages }));
    } catch {
      setError('Error al cargar las citas');
    } finally {
      setLoading(false);
    }
  }, [
    pagination.searchValue,
    pagination.currentPage,
    pagination.pageSize,
    pagination.orderBy,
    pagination.orderByMode,
    filters,
  ]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const debouncedSearch = useDebouncedCallback(
    (value: string) => setPagination((prev) => ({ ...prev, searchValue: value, currentPage: 1 })),
    500,
  );

  const updateFilters = useCallback((updates: Partial<AppointmentFilters>) => {
    setFilters((prev) => ({ ...prev, ...updates }));
    setPagination((prev) => ({ ...prev, currentPage: 1 }));
  }, []);

  // Misma clave que el espacio de atención del médico (UI-16): las dos vistas comparten la caché.
  const notes = useQuery({
    queryKey: ['clinical-notes', 'appointment', selectedId],
    queryFn: () => clinicalNotesService.getByAppointment(selectedId!),
    enabled: selectedId !== null,
  });

  const panelError = notes.error
    ? extractApiError(notes.error).status === 403
      ? 'No tienes permiso para ver las notas de esta cita'
      : 'Error al cargar las notas clínicas'
    : null;

  const create = useMutation({
    mutationFn: (payload: CreateClinicalNotePayload) => clinicalNotesService.create(payload),
    onSuccess: async (_, payload) => {
      await Promise.all([queryClient.invalidateQueries({ queryKey: ['clinical-notes', 'appointment', payload.appointmentId] }), fetchData()]);
    },
  });

  const selectAppointment = useCallback(
    (appointment: Appointment) => {
      setChosen(appointment);
      select(appointment.id);
    },
    [select],
  );

  return {
    data,
    loading,
    error,
    pagination,
    setPagination,
    filters,
    debouncedSearch,
    updateFilters,
    refresh: fetchData,
    selectedId,
    selectedAppointment,
    selectAppointment,
    clearSelection: clear,
    notes: notes.data ?? [],
    loadingNotes: notes.isLoading,
    panelError,
    createNote: (payload: CreateClinicalNotePayload) => create.mutateAsync(payload),
    loadingCreate: create.isPending,
    createError: create.error ? extractApiError(create.error, 'No se pudo guardar la nota clínica').message : null,
  };
}
