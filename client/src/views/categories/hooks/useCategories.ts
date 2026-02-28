'use client';

import { useEffect, useState, useCallback } from 'react';
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';
import { useAppDispatch, useAppSelector } from '@/redux-store/hooks';
import {
  selectCategoriesData,
  selectCategoriesLoading,
  selectCategoriesError,
  selectCategoriesPagination,
  setCategoriesPagination,
} from '@/redux-store/slices/categories';
import {
  fetchCategoriesPaginatedThunk,
  deleteCategoryThunk,
} from '@/redux-store/thunks/categories.thunks';
import type { Category } from '../types';

export function useCategories() {
  const dispatch = useAppDispatch();

  const data = useAppSelector(selectCategoriesData);
  const loading = useAppSelector(selectCategoriesLoading);
  const error = useAppSelector(selectCategoriesError);
  const pagination = useAppSelector(selectCategoriesPagination);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerData, setDrawerData] = useState<{
    data: Category | null;
    action: 'Create' | 'Update';
  }>({ data: null, action: 'Create' });

  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [selectedDeleteId, setSelectedDeleteId] = useState<number | null>(null);

  const fetchData = useCallback(() => {
    void dispatch(
      fetchCategoriesPaginatedThunk({
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
    (updates: Parameters<typeof setCategoriesPagination>[0]) => {
      dispatch(setCategoriesPagination(updates));
    },
    [dispatch],
  );

  const debouncedSearch = useDebouncedCallback(
    (value: string) => updatePagination({ searchValue: value, currentPage: 1 }),
    500,
  );

  const openCreateDrawer = () => {
    setDrawerData({ data: null, action: 'Create' });
    setDrawerOpen(true);
  };

  const openEditDrawer = (category: Category) => {
    setDrawerData({ data: category, action: 'Update' });
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
      const result = await dispatch(deleteCategoryThunk(selectedDeleteId));

      if (deleteCategoryThunk.fulfilled.match(result)) {
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
    loading,
    error,
    pagination,
    setPagination: (updater: React.SetStateAction<typeof pagination>) => {
      const newVal =
        typeof updater === 'function' ? updater(pagination) : updater;
      dispatch(setCategoriesPagination(newVal));
    },
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
