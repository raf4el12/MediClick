'use client';

import { useEffect, useState, useCallback } from 'react';
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';
import { useAppDispatch, useAppSelector } from '@/redux-store/hooks';
import {
  selectSpecialtiesData,
  selectCategories,
  selectSpecialtiesLoading,
  selectSpecialtiesError,
  selectSpecialtiesPagination,
  setPagination as setPaginationAction,
} from '@/redux-store/slices/specialties';
import {
  fetchSpecialtiesThunk,
  fetchCategoriesThunk,
  deleteSpecialtyThunk,
} from '@/redux-store/thunks/specialties.thunks';
import type { Specialty } from '../types';

export function useSpecialties() {
  const dispatch = useAppDispatch();

  const data = useAppSelector(selectSpecialtiesData);
  const categories = useAppSelector(selectCategories);
  const loading = useAppSelector(selectSpecialtiesLoading);
  const error = useAppSelector(selectSpecialtiesError);
  const pagination = useAppSelector(selectSpecialtiesPagination);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerData, setDrawerData] = useState<{
    data: Specialty | null;
    action: 'Create' | 'Update';
  }>({ data: null, action: 'Create' });

  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [selectedDeleteId, setSelectedDeleteId] = useState<number | null>(null);

  const fetchData = useCallback(() => {
    void dispatch(
      fetchSpecialtiesThunk({
        pagination: {
          searchValue: pagination.searchValue || undefined,
          currentPage: pagination.currentPage,
          pageSize: pagination.pageSize,
          orderBy: pagination.orderBy,
          orderByMode: pagination.orderByMode,
        },
        categoryId: pagination.categoryId,
      }),
    );
  }, [
    dispatch,
    pagination.searchValue,
    pagination.currentPage,
    pagination.pageSize,
    pagination.orderBy,
    pagination.orderByMode,
    pagination.categoryId,
  ]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    void dispatch(fetchCategoriesThunk());
  }, [dispatch]);

  const updatePagination = useCallback(
    (updates: Parameters<typeof setPaginationAction>[0]) => {
      dispatch(setPaginationAction(updates));
    },
    [dispatch],
  );

  const debouncedSearch = useDebouncedCallback(
    (value: string) => updatePagination({ searchValue: value, currentPage: 1 }),
    500,
  );

  const handleCategoryFilter = (categoryId: number | undefined) => {
    updatePagination({ categoryId, currentPage: 1 });
  };

  const openCreateDrawer = () => {
    setDrawerData({ data: null, action: 'Create' });
    setDrawerOpen(true);
  };

  const openEditDrawer = (specialty: Specialty) => {
    setDrawerData({ data: specialty, action: 'Update' });
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
  };

  const openDeleteDialog = (id: number) => {
    setSelectedDeleteId(id);
    setConfirmDialogOpen(true);
  };

  const handleDelete = async (confirmed: boolean) => {
    if (confirmed && selectedDeleteId) {
      const result = await dispatch(deleteSpecialtyThunk(selectedDeleteId));

      if (deleteSpecialtyThunk.fulfilled.match(result)) {
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

  return {
    data,
    categories,
    loading,
    error,
    pagination,
    setPagination: (updater: React.SetStateAction<typeof pagination>) => {
      const newVal =
        typeof updater === 'function' ? updater(pagination) : updater;
      dispatch(setPaginationAction(newVal));
    },
    debouncedSearch,
    handleCategoryFilter,
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
