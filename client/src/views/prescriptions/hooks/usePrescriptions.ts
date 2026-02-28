'use client';

import { useEffect, useState, useCallback } from 'react';
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';
import { appointmentsService } from '@/services/appointments.service';
import { prescriptionsService } from '@/services/prescriptions.service';
import type { PaginatedResponse } from '@/types/pagination.types';
import type { Appointment, AppointmentFilters } from '@/views/appointments/types';
import type { Prescription, CreatePrescriptionPayload } from '../types';

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

export function usePrescriptions() {
  const [data, setData] = useState<PaginatedResponse<Appointment>>(DEFAULT_DATA);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [pagination, setPagination] = useState(DEFAULT_PAGINATION);
  const [filters, setFilters] = useState<AppointmentFilters>({});

  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [prescription, setPrescription] = useState<Prescription | null>(null);
  const [loadingPrescription, setLoadingPrescription] = useState(false);
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

  const debouncedSearch = useDebouncedCallback(
    (value: string) => setPagination((prev) => ({ ...prev, searchValue: value, currentPage: 1 })),
    500,
  );

  const updateFilters = useCallback((updates: Partial<AppointmentFilters>) => {
    setFilters((prev) => ({ ...prev, ...updates }));
    setPagination((prev) => ({ ...prev, currentPage: 1 }));
  }, []);

  const loadPrescription = useCallback(async (appointmentId: number) => {
    setLoadingPrescription(true);
    setPanelError(null);
    setPrescription(null);
    try {
      const result = await prescriptionsService.getByAppointment(appointmentId);
      setPrescription(result);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 403) {
        setPanelError('No tienes permiso para ver la receta de esta cita');
      } else if (status === 404) {
        // Sin receta aún — estado normal, no es error
        setPrescription(null);
      } else {
        setPanelError('Error al cargar la receta');
      }
    } finally {
      setLoadingPrescription(false);
    }
  }, []);

  const selectAppointment = useCallback(
    (appointment: Appointment) => {
      setSelectedAppointment(appointment);
      void loadPrescription(appointment.id);
    },
    [loadPrescription],
  );

  const clearSelection = useCallback(() => {
    setSelectedAppointment(null);
    setPrescription(null);
    setPanelError(null);
  }, []);

  const createPrescription = useCallback(
    async (payload: CreatePrescriptionPayload) => {
      setLoadingCreate(true);
      try {
        await prescriptionsService.create(payload);
        await Promise.all([loadPrescription(payload.appointmentId), fetchData()]);
      } finally {
        setLoadingCreate(false);
      }
    },
    [loadPrescription, fetchData],
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
    prescription,
    loadingPrescription,
    loadingCreate,
    panelError,
    createPrescription,
  };
}
