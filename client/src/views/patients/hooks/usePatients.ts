'use client';

import { useEffect, useState, useCallback } from 'react';
import { debounce } from '@/utils/debounce';
import { useAppDispatch, useAppSelector } from '@/redux-store/hooks';
import {
  selectPatientsData,
  selectPatientsLoading,
  selectPatientsError,
  selectPatientsPagination,
  setPatientsPagination,
} from '@/redux-store/slices/patients';
import { fetchPatientsThunk } from '@/redux-store/thunks/patients.thunks';
import type { Patient } from '../types';

export function usePatients() {
  const dispatch = useAppDispatch();

  const data = useAppSelector(selectPatientsData);
  const loading = useAppSelector(selectPatientsLoading);
  const error = useAppSelector(selectPatientsError);
  const pagination = useAppSelector(selectPatientsPagination);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detailPatient, setDetailPatient] = useState<Patient | null>(null);

  const fetchData = useCallback(() => {
    const isActive =
      pagination.statusFilter === 'active'
        ? true
        : pagination.statusFilter === 'inactive'
          ? false
          : undefined;

    void dispatch(
      fetchPatientsThunk({
        searchValue: pagination.searchValue || undefined,
        currentPage: pagination.currentPage,
        pageSize: pagination.pageSize,
        orderBy: pagination.orderBy,
        orderByMode: pagination.orderByMode,
        isActive,
      }),
    );
  }, [
    dispatch,
    pagination.searchValue,
    pagination.currentPage,
    pagination.pageSize,
    pagination.orderBy,
    pagination.orderByMode,
    pagination.statusFilter,
  ]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const updatePagination = useCallback(
    (updates: Parameters<typeof setPatientsPagination>[0]) => {
      dispatch(setPatientsPagination(updates));
    },
    [dispatch],
  );

  const debouncedSearch = useCallback(
    debounce((value: string) => {
      updatePagination({ searchValue: value, currentPage: 1 });
    }, 500),
    [updatePagination],
  );

  const setStatusFilter = useCallback(
    (status: 'all' | 'active' | 'inactive') => {
      updatePagination({ statusFilter: status, currentPage: 1 });
    },
    [updatePagination],
  );

  const openCreateDrawer = () => {
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
  };

  const openDetail = (patient: Patient) => {
    setDetailPatient(patient);
  };

  const closeDetail = () => {
    setDetailPatient(null);
  };

  return {
    data,
    loading,
    error,
    pagination,
    setPagination: (updater: React.SetStateAction<typeof pagination>) => {
      const newVal =
        typeof updater === 'function' ? updater(pagination) : updater;
      dispatch(setPatientsPagination(newVal));
    },
    debouncedSearch,
    setStatusFilter,
    drawerOpen,
    openCreateDrawer,
    closeDrawer,
    detailPatient,
    openDetail,
    closeDetail,
    refreshData: fetchData,
  };
}
