'use client';

import { useEffect, useState, useCallback } from 'react';
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';
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
import { doctorsService } from '@/services/doctors.service';
import { clinicsService } from '@/services/clinics.service';
import type { Doctor } from '../types';
import type { Clinic } from '@/views/clinics/types';

export function useDoctors() {
  const dispatch = useAppDispatch();

  const data = useAppSelector(selectDoctorsData);
  const specialties = useAppSelector(selectDoctorSpecialties);
  const loading = useAppSelector(selectDoctorsLoading);
  const error = useAppSelector(selectDoctorsError);
  const pagination = useAppSelector(selectDoctorsPagination);

  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detailDoctor, setDetailDoctor] = useState<Doctor | null>(null);
  const [editDoctor, setEditDoctor] = useState<Doctor | null>(null);
  const [deleteDoctor, setDeleteDoctor] = useState<Doctor | null>(null);
  const [deleting, setDeleting] = useState(false);

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
    void clinicsService.findAll().then(setClinics).catch(() => {});
  }, [dispatch]);

  const updatePagination = useCallback(
    (updates: Parameters<typeof setDoctorsPagination>[0]) => {
      dispatch(setDoctorsPagination(updates));
    },
    [dispatch],
  );

  const debouncedSearch = useDebouncedCallback(
    (value: string) => updatePagination({ searchValue: value, currentPage: 1 }),
    500,
  );

  const handleSpecialtyFilter = (specialtyId: number | undefined) => {
    updatePagination({ specialtyId, currentPage: 1 });
  };

  const openCreateDrawer = () => setDrawerOpen(true);
  const closeDrawer = () => setDrawerOpen(false);

  const openDetail = (doctor: Doctor) => setDetailDoctor(doctor);
  const closeDetail = () => setDetailDoctor(null);

  const openEditDrawer = (doctor: Doctor) => setEditDoctor(doctor);
  const closeEditDrawer = () => setEditDoctor(null);

  const openDeleteDialog = (doctor: Doctor) => setDeleteDoctor(doctor);
  const closeDeleteDialog = () => setDeleteDoctor(null);

  const confirmDelete = async (): Promise<boolean> => {
    if (!deleteDoctor) return false;
    setDeleting(true);
    try {
      await doctorsService.remove(deleteDoctor.id);
      setDeleteDoctor(null);
      fetchData();
      return true;
    } catch {
      return false;
    } finally {
      setDeleting(false);
    }
  };

  return {
    data,
    specialties,
    clinics,
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
    editDoctor,
    openEditDrawer,
    closeEditDrawer,
    deleteDoctor,
    openDeleteDialog,
    closeDeleteDialog,
    confirmDelete,
    deleting,
    refreshData: fetchData,
  };
}
