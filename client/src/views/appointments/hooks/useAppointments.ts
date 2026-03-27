'use client';

import { useEffect, useState, useCallback } from 'react';
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';
import { useAppDispatch, useAppSelector } from '@/redux-store/hooks';
import {
  selectAppointmentsData,
  selectAppointmentsLoading,
  selectAppointmentsError,
  selectAppointmentsPagination,
  selectAppointmentsFilters,
  setAppointmentsPagination,
  setAppointmentsFilters,
} from '@/redux-store/slices/appointments';
import { fetchAppointmentsThunk } from '@/redux-store/thunks/appointments.thunks';
import { appointmentsService } from '@/services/appointments.service';
import { extractApiError } from '@/utils/extractApiError';
import type { Appointment, AppointmentFilters } from '../types';

export function useAppointments() {
  const dispatch = useAppDispatch();

  const data = useAppSelector(selectAppointmentsData);
  const loading = useAppSelector(selectAppointmentsLoading);
  const error = useAppSelector(selectAppointmentsError);
  const pagination = useAppSelector(selectAppointmentsPagination);
  const filters = useAppSelector(selectAppointmentsFilters);

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [rescheduleDialogOpen, setRescheduleDialogOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [detailAppointment, setDetailAppointment] = useState<Appointment | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchData = useCallback(() => {
    void dispatch(
      fetchAppointmentsThunk({
        pagination: {
          searchValue: pagination.searchValue || undefined,
          currentPage: pagination.currentPage,
          pageSize: pagination.pageSize,
          orderBy: pagination.orderBy,
          orderByMode: pagination.orderByMode,
        },
        filters,
      }),
    );
  }, [
    dispatch,
    pagination.searchValue,
    pagination.currentPage,
    pagination.pageSize,
    pagination.orderBy,
    pagination.orderByMode,
    filters,
  ]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const updatePagination = useCallback(
    (updates: Parameters<typeof setAppointmentsPagination>[0]) => {
      dispatch(setAppointmentsPagination(updates));
    },
    [dispatch],
  );

  const updateFilters = useCallback(
    (updates: Partial<AppointmentFilters>) => {
      dispatch(setAppointmentsFilters(updates));
    },
    [dispatch],
  );

  const debouncedSearch = useDebouncedCallback(
    (value: string) => updatePagination({ searchValue: value, currentPage: 1 }),
    500,
  )

  const openCreateDialog = () => setCreateDialogOpen(true);
  const closeCreateDialog = () => setCreateDialogOpen(false);

  const openCancelDialog = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setCancelDialogOpen(true);
  };

  const closeCancelDialog = () => {
    setCancelDialogOpen(false);
    setSelectedAppointment(null);
  };

  const openRescheduleDialog = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setRescheduleDialogOpen(true);
  };

  const closeRescheduleDialog = () => {
    setRescheduleDialogOpen(false);
    setSelectedAppointment(null);
  };

  const openDetail = (appointment: Appointment) => {
    setDetailAppointment(appointment);
  };

  const closeDetail = () => {
    setDetailAppointment(null);
  };

  const handleCheckIn = async (id: number) => {
    try {
      setActionError(null);
      await appointmentsService.checkIn(id);
      fetchData();
    } catch (err: unknown) {
      setActionError(extractApiError(err, 'Error al registrar llegada').message);
    }
  };

  const handleCancel = async (id: number, reason: string) => {
    try {
      setActionError(null);
      await appointmentsService.cancel(id, { reason });
      fetchData();
      closeCancelDialog();
    } catch (err: unknown) {
      setActionError(extractApiError(err, 'Error al cancelar la cita').message);
    }
  };

  const handleReschedule = async (id: number, newScheduleId: number, startTime: string, endTime: string, reason?: string) => {
    try {
      setActionError(null);
      await appointmentsService.reschedule(id, { newScheduleId, startTime, endTime, reason });
      fetchData();
      closeRescheduleDialog();
    } catch (err: unknown) {
      setActionError(extractApiError(err, 'Error al reagendar la cita').message);
    }
  };

  const handleComplete = async (id: number) => {
    try {
      setActionError(null);
      await appointmentsService.complete(id);
      fetchData();
    } catch (err: unknown) {
      setActionError(extractApiError(err, 'Error al completar la cita').message);
    }
  };

  return {
    data,
    loading,
    error,
    pagination,
    filters,
    setPagination: (updater: React.SetStateAction<typeof pagination>) => {
      const newVal =
        typeof updater === 'function' ? updater(pagination) : updater;
      dispatch(setAppointmentsPagination(newVal));
    },
    debouncedSearch,
    updateFilters,
    createDialogOpen,
    openCreateDialog,
    closeCreateDialog,
    cancelDialogOpen,
    openCancelDialog,
    closeCancelDialog,
    rescheduleDialogOpen,
    openRescheduleDialog,
    closeRescheduleDialog,
    selectedAppointment,
    detailAppointment,
    openDetail,
    closeDetail,
    handleCheckIn,
    handleCancel,
    handleReschedule,
    handleComplete,
    actionError,
    clearActionError: () => setActionError(null),
    refreshData: fetchData,
  };
}
