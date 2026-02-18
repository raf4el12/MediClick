'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { debounce } from '@/utils/debounce';
import { appointmentsService } from '@/services/appointments.service';
import { clinicalNotesService } from '@/services/clinical-notes.service';
import type { PaginatedResponse } from '@/types/pagination.types';
import type { Appointment, AppointmentFilters } from '@/views/appointments/types';
import type { ClinicalNote, CreateClinicalNotePayload } from '../types';

const DEFAULT_PAGINATION = {
  searchValue: '',
  currentPage: 1,
  pageSize: 8,
  orderBy: 'id',
  orderByMode: 'desc' as const,
  totalPages: 1,
};

const DEFAULT_DATA: PaginatedResponse<Appointment> = {
  totalRows: 0,
  rows: [],
  totalPages: 1,
  currentPage: 1,
};

export function useClinicalNotes() {
  const [data, setData] = useState<PaginatedResponse<Appointment>>(DEFAULT_DATA);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [pagination, setPagination] = useState(DEFAULT_PAGINATION);
  const [filters, setFilters] = useState<AppointmentFilters>({});

  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [notes, setNotes] = useState<ClinicalNote[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [loadingCreate, setLoadingCreate] = useState(false);
  const [panelError, setPanelError] = useState<string | null>(null);

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

  const debouncedSearch = useMemo(
    () =>
      debounce((value: string) => {
        setPagination((prev) => ({ ...prev, searchValue: value, currentPage: 1 }));
      }, 500),
    [],
  );

  const updateFilters = useCallback((updates: Partial<AppointmentFilters>) => {
    setFilters((prev) => ({ ...prev, ...updates }));
    setPagination((prev) => ({ ...prev, currentPage: 1 }));
  }, []);

  const loadNotes = useCallback(async (appointmentId: number) => {
    setLoadingNotes(true);
    setPanelError(null);
    setNotes([]);
    try {
      const result = await clinicalNotesService.getByAppointment(appointmentId);
      setNotes(result);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 403) {
        setPanelError('No tienes permiso para ver las notas de esta cita');
      } else {
        setPanelError('Error al cargar las notas clínicas');
      }
    } finally {
      setLoadingNotes(false);
    }
  }, []);

  const selectAppointment = useCallback(
    (appointment: Appointment) => {
      setSelectedAppointment(appointment);
      void loadNotes(appointment.id);
    },
    [loadNotes],
  );

  const clearSelection = useCallback(() => {
    setSelectedAppointment(null);
    setNotes([]);
    setPanelError(null);
  }, []);

  const createNote = useCallback(
    async (payload: CreateClinicalNotePayload) => {
      setLoadingCreate(true);
      try {
        await clinicalNotesService.create(payload);
        await loadNotes(payload.appointmentId);
        void fetchData();
      } finally {
        setLoadingCreate(false);
      }
    },
    [loadNotes, fetchData],
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
    selectedAppointment,
    selectAppointment,
    clearSelection,
    notes,
    loadingNotes,
    loadingCreate,
    panelError,
    createNote,
  };
}
