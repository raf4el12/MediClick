'use client';

import { useEffect, useState, useCallback } from 'react';
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';
import { useAppDispatch, useAppSelector } from '@/redux-store/hooks';
import {
  selectUsersData,
  selectUsersLoading,
  selectUsersError,
  selectUsersPagination,
  setUsersPagination,
} from '@/redux-store/slices/users';
import { fetchUsersThunk } from '@/redux-store/thunks/users.thunks';
import type { User } from '../types';

export function useUsers() {
  const dispatch = useAppDispatch();

  const data = useAppSelector(selectUsersData);
  const loading = useAppSelector(selectUsersLoading);
  const error = useAppSelector(selectUsersError);
  const pagination = useAppSelector(selectUsersPagination);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detailUser, setDetailUser] = useState<User | null>(null);
  const [editUser, setEditUser] = useState<User | null>(null);

  const fetchData = useCallback(() => {
    void dispatch(
      fetchUsersThunk({
        pagination: {
          searchValue: pagination.searchValue || undefined,
          currentPage: pagination.currentPage,
          pageSize: pagination.pageSize,
          orderBy: pagination.orderBy,
          orderByMode: pagination.orderByMode,
        },
        role: pagination.role,
      }),
    );
  }, [
    dispatch,
    pagination.searchValue,
    pagination.currentPage,
    pagination.pageSize,
    pagination.orderBy,
    pagination.orderByMode,
    pagination.role,
  ]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const updatePagination = useCallback(
    (updates: Parameters<typeof setUsersPagination>[0]) => {
      dispatch(setUsersPagination(updates));
    },
    [dispatch],
  );

  const debouncedSearch = useDebouncedCallback(
    (value: string) => updatePagination({ searchValue: value, currentPage: 1 }),
    500,
  );

  const handleRoleFilter = (role: string | undefined) => {
    updatePagination({ role, currentPage: 1 });
  };

  const openCreateDrawer = () => {
    setEditUser(null);
    setDrawerOpen(true);
  };

  const openEditDrawer = (user: User) => {
    setEditUser(user);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setEditUser(null);
  };

  const openDetail = (user: User) => {
    setDetailUser(user);
  };

  const closeDetail = () => {
    setDetailUser(null);
  };

  return {
    data,
    loading,
    error,
    pagination,
    setPagination: (updater: React.SetStateAction<typeof pagination>) => {
      const newVal =
        typeof updater === 'function' ? updater(pagination) : updater;
      dispatch(setUsersPagination(newVal));
    },
    debouncedSearch,
    handleRoleFilter,
    drawerOpen,
    openCreateDrawer,
    openEditDrawer,
    closeDrawer,
    detailUser,
    openDetail,
    closeDetail,
    editUser,
    refreshData: fetchData,
  };
}
