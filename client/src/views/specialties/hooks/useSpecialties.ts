'use client';

import { useEffect, useState, useCallback } from 'react';
import { debounce } from '@/utils/debounce';
import { specialtiesService } from '@/services/specialties.service';
import { categoriesService } from '@/services/categories.service';
import type { Specialty, Category } from '../types';
import type { PaginatedResponse } from '@/types/pagination.types';

interface PaginationValues {
  searchValue: string;
  currentPage: number;
  pageSize: number;
  orderBy: string;
  orderByMode: 'asc' | 'desc';
  totalPages: number;
  categoryId?: number;
}

export function useSpecialties() {
  const [data, setData] = useState<PaginatedResponse<Specialty>>({
    totalRows: 0,
    rows: [],
    totalPages: 0,
    currentPage: 1,
  });
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerData, setDrawerData] = useState<{
    data: Specialty | null;
    action: 'Create' | 'Update';
  }>({ data: null, action: 'Create' });

  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [selectedDeleteId, setSelectedDeleteId] = useState<number | null>(null);

  const [pagination, setPagination] = useState<PaginationValues>({
    searchValue: '',
    currentPage: 1,
    pageSize: 8,
    orderBy: 'id',
    orderByMode: 'desc',
    totalPages: 0,
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await specialtiesService.findAllPaginated(
        {
          searchValue: pagination.searchValue || undefined,
          currentPage: pagination.currentPage,
          pageSize: pagination.pageSize,
          orderBy: pagination.orderBy,
          orderByMode: pagination.orderByMode,
        },
        pagination.categoryId,
      );

      setData(result);
      setPagination((prev) => ({
        ...prev,
        totalPages: result.totalPages,
      }));
    } catch {
      setError('Error al cargar especialidades');
    } finally {
      setLoading(false);
    }
  }, [
    pagination.searchValue,
    pagination.currentPage,
    pagination.pageSize,
    pagination.orderBy,
    pagination.orderByMode,
    pagination.categoryId,
  ]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const result = await categoriesService.findAll();
        setCategories(result);
      } catch {
        console.error('Error fetching categories');
      }
    };

    void fetchCategories();
  }, []);

  const debouncedSearch = useCallback(
    debounce((value: string) => {
      setPagination((prev) => ({
        ...prev,
        searchValue: value,
        currentPage: 1,
      }));
    }, 500),
    [],
  );

  const handleCategoryFilter = (categoryId: number | undefined) => {
    setPagination((prev) => ({
      ...prev,
      categoryId,
      currentPage: 1,
    }));
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
      try {
        await specialtiesService.delete(selectedDeleteId);

        const totalAfter = data.totalRows - 1;
        const newTotalPages = Math.ceil(totalAfter / pagination.pageSize);

        if (pagination.currentPage > newTotalPages && pagination.currentPage > 1) {
          setPagination((prev) => ({
            ...prev,
            currentPage: newTotalPages,
          }));
        } else {
          await fetchData();
        }
      } catch {
        setError('Error al eliminar la especialidad');
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
    setPagination,
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
