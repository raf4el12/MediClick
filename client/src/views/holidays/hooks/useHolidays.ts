'use client';

import { useEffect, useState, useCallback } from 'react';

import { holidaysService } from '@/services/holidays.service';
import type {
  Holiday,
  PaginatedHolidays,
  CreateHolidayPayload,
  UpdateHolidayPayload,
} from '../types';

const DEFAULT_DATA: PaginatedHolidays = {
  totalRows: 0,
  rows: [],
  totalPages: 1,
  currentPage: 1,
};

export function useHolidays() {
  const [data, setData] = useState<PaginatedHolidays>(DEFAULT_DATA);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [limit] = useState(12);
  const [yearFilter, setYearFilter] = useState<number>(new Date().getFullYear());

  const [createOpen, setCreateOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<Holiday | null>(null);
  const [deleteEntry, setDeleteEntry] = useState<Holiday | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [seeding, setSeeding] = useState(false);

  // Cargar feriados
  const fetchEntries = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await holidaysService.findAll({
        currentPage: page,
        pageSize: limit,
        year: yearFilter,
      });

      setData(result);
    } catch {
      setError('Error al cargar los feriados');
      setData(DEFAULT_DATA);
    } finally {
      setLoading(false);
    }
  }, [page, limit, yearFilter]);

  useEffect(() => {
    void fetchEntries();
  }, [fetchEntries]);

  const handleYearChange = useCallback((year: number) => {
    setYearFilter(year);
    setPage(1);
  }, []);

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  // CRUD
  const handleCreate = useCallback(
    async (payload: CreateHolidayPayload) => {
      setSubmitting(true);

      try {
        await holidaysService.create(payload);
        setCreateOpen(false);
        await fetchEntries();
      } catch {
        throw new Error('Error al crear el feriado');
      } finally {
        setSubmitting(false);
      }
    },
    [fetchEntries],
  );

  const handleUpdate = useCallback(
    async (id: number, payload: UpdateHolidayPayload) => {
      setSubmitting(true);

      try {
        await holidaysService.update(id, payload);
        setEditEntry(null);
        await fetchEntries();
      } catch {
        throw new Error('Error al actualizar el feriado');
      } finally {
        setSubmitting(false);
      }
    },
    [fetchEntries],
  );

  const handleDelete = useCallback(
    async (id: number) => {
      setSubmitting(true);

      try {
        await holidaysService.remove(id);
        setDeleteEntry(null);
        await fetchEntries();
      } catch {
        throw new Error('Error al eliminar el feriado');
      } finally {
        setSubmitting(false);
      }
    },
    [fetchEntries],
  );

  const handleSeed = useCallback(async () => {
    setSeeding(true);

    try {
      await holidaysService.seed(yearFilter);
      await fetchEntries();
    } catch {
      setError('Error al sembrar los feriados');
    } finally {
      setSeeding(false);
    }
  }, [yearFilter, fetchEntries]);

  return {
    // Datos
    data,
    loading,
    error,

    // Paginación y filtros
    page,
    limit,
    yearFilter,
    handleYearChange,
    handlePageChange,

    // Diálogos
    createOpen,
    setCreateOpen,
    editEntry,
    setEditEntry,
    deleteEntry,
    setDeleteEntry,

    // CRUD
    submitting,
    handleCreate,
    handleUpdate,
    handleDelete,

    // Seed
    seeding,
    handleSeed,
  };
}
