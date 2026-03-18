'use client';

import { useEffect, useState, useCallback } from 'react';
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';
import { useAppDispatch, useAppSelector } from '@/redux-store/hooks';
import {
  selectClinicsData,
  selectClinicsLoading,
  selectClinicsError,
  selectClinicsPagination,
  setClinicsPagination,
} from '@/redux-store/slices/clinics';
import {
  fetchClinicsPaginatedThunk,
  deleteClinicThunk,
} from '@/redux-store/thunks/clinics.thunks';
import type { Clinic } from '../types';

export function useClinics() {
  const dispatch = useAppDispatch();

  const data = useAppSelector(selectClinicsData);
  const loading = useAppSelector(selectClinicsLoading);
  const error = useAppSelector(selectClinicsError);
  const pagination = useAppSelector(selectClinicsPagination);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerData, setDrawerData] = useState<{
    data: Clinic | null;
    action: 'Create' | 'Update';
  }>({ data: null, action: 'Create' });

  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [selectedDeleteId, setSelectedDeleteId] = useState<number | null>(null);

  const fetchData = useCallback(() => {
    void dispatch(
      fetchClinicsPaginatedThunk({
        searchValue: pagination.searchValue || undefined,
        currentPage: pagination.currentPage,
        pageSize: pagination.pageSize,
        orderBy: pagination.orderBy,
        orderByMode: pagination.orderByMode,
      }),
    );
  }, [
    dispatch,
    pagination.searchValue,
    pagination.currentPage,
    pagination.pageSize,
    pagination.orderBy,
    pagination.orderByMode,
  ]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const updatePagination = useCallback(
    (updates: Parameters<typeof setClinicsPagination>[0]) => {
      dispatch(setClinicsPagination(updates));
    },
    [dispatch],
  );

  const debouncedSearch = useDebouncedCallback(
    (value: string) => updatePagination({ searchValue: value, currentPage: 1 }),
    500,
  );

  const openCreateDrawer = useCallback(() => {
    setDrawerData({ data: null, action: 'Create' });
    setDrawerOpen(true);
  }, []);

  const openEditDrawer = useCallback((clinic: Clinic) => {
    setDrawerData({ data: clinic, action: 'Update' });
    setDrawerOpen(true);
  }, []);

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
  }, []);

  const openDeleteDialog = useCallback((id: number) => {
    setSelectedDeleteId(id);
    setConfirmDialogOpen(true);
  }, []);

  const handleDelete = async (confirmed: boolean) => {
    if (confirmed && selectedDeleteId) {
      const result = await dispatch(deleteClinicThunk(selectedDeleteId));

      if (deleteClinicThunk.fulfilled.match(result)) {
        const totalAfter = data.totalRows - 1;
        const newTotalPages = Math.ceil(totalAfter / pagination.pageSize);

        if (pagination.currentPage > newTotalPages && pagination.currentPage > 1) {
          updatePagination({ currentPage: newTotalPages });
        } else {
          fetchData();
        }
      }
    }

    setConfirmDialogOpen(false);
    setSelectedDeleteId(null);
  };

  const setPagination = useCallback(
    (updater: React.SetStateAction<typeof pagination>) => {
      const newVal =
        typeof updater === 'function' ? updater(pagination) : updater;
      dispatch(setClinicsPagination(newVal));
    },
    [pagination, dispatch],
  );

  return {
    data,
    loading,
    error,
    pagination,
    setPagination,
    debouncedSearch,
    drawerOpen,
    drawerData,
    openCreateDrawer,
    openEditDrawer,
    closeDrawer,
    confirmDialogOpen,
    setConfirmDialogOpen,
    openDeleteDialog,
    handleDelete,
    refreshData: fetchData,
  };
}
