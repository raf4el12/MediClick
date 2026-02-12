'use client';

import { useEffect, useState, useCallback } from 'react';
import { debounce } from '@/utils/debounce';
import { useAppDispatch, useAppSelector } from '@/redux-store/hooks';
import {
  selectDoctorsData,
  selectDoctorSpecialties,
  selectDoctorsLoading,
  selectDoctorsError,
  selectDoctorsPagination,
  setDoctorsPagination,
} from '@/redux-store/slices/doctors';
import {
  fetchDoctorsThunk,
  fetchDoctorSpecialtiesThunk,
} from '@/redux-store/thunks/doctors.thunks';
import type { Doctor } from '../types';

export function useDoctors() {
  const dispatch = useAppDispatch();

  const data = useAppSelector(selectDoctorsData);
  const specialties = useAppSelector(selectDoctorSpecialties);
  const loading = useAppSelector(selectDoctorsLoading);
  const error = useAppSelector(selectDoctorsError);
  const pagination = useAppSelector(selectDoctorsPagination);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detailDoctor, setDetailDoctor] = useState<Doctor | null>(null);

  const fetchData = useCallback(() => {
    void dispatch(
      fetchDoctorsThunk({
        pagination: {
          searchValue: pagination.searchValue || undefined,
          currentPage: pagination.currentPage,
          pageSize: pagination.pageSize,
          orderBy: pagination.orderBy,
          orderByMode: pagination.orderByMode,
        },
        specialtyId: pagination.specialtyId,
      }),
    );
  }, [
    dispatch,
    pagination.searchValue,
    pagination.currentPage,
    pagination.pageSize,
    pagination.orderBy,
    pagination.orderByMode,
    pagination.specialtyId,
  ]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    void dispatch(fetchDoctorSpecialtiesThunk());
  }, [dispatch]);

  const updatePagination = useCallback(
    (updates: Parameters<typeof setDoctorsPagination>[0]) => {
      dispatch(setDoctorsPagination(updates));
    },
    [dispatch],
  );

  const debouncedSearch = useCallback(
    debounce((value: string) => {
      updatePagination({ searchValue: value, currentPage: 1 });
    }, 500),
    [updatePagination],
  );

  const handleSpecialtyFilter = (specialtyId: number | undefined) => {
    updatePagination({ specialtyId, currentPage: 1 });
  };

  const openCreateDrawer = () => {
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
  };

  const openDetail = (doctor: Doctor) => {
    setDetailDoctor(doctor);
  };

  const closeDetail = () => {
    setDetailDoctor(null);
  };

  return {
    data,
    specialties,
    loading,
    error,
    pagination,
    setPagination: (updater: React.SetStateAction<typeof pagination>) => {
      const newVal =
        typeof updater === 'function' ? updater(pagination) : updater;
      dispatch(setDoctorsPagination(newVal));
    },
    debouncedSearch,
    handleSpecialtyFilter,
    drawerOpen,
    openCreateDrawer,
    closeDrawer,
    detailDoctor,
    openDetail,
    closeDetail,
    refreshData: fetchData,
  };
}
