'use client';

import { useEffect, useState, useCallback } from 'react';
import { isAxiosError } from 'axios';

import { holidaysService } from '@/services/holidays.service';
import { clinicsService } from '@/services/clinics.service';
import type {
  Holiday,
  PaginatedHolidays,
  CreateHolidayPayload,
  UpdateHolidayPayload,
} from '../types';
import type { Clinic } from '@/views/clinics/types';

const DEFAULT_DATA: PaginatedHolidays = {
  totalRows: 0,
  rows: [],
  totalPages: 1,
  currentPage: 1,
};

function extractApiError(err: unknown): string {
  if (isAxiosError(err)) {
    const data = err.response?.data;
    if (data?.message) {
      if (Array.isArray(data.message)) return data.message.join('. ');
      return data.message;
    }
  }
  return '';
}

export function useHolidays() {
  const [data, setData] = useState<PaginatedHolidays>(DEFAULT_DATA);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [limit] = useState(12);
  const [yearFilter, setYearFilter] = useState<number>(new Date().getFullYear());

  const [createOpen, setCreateOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<Holiday | null>(null);
  const [deleteEntry, setDeleteEntry] = useState<Holiday | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const closeFormDialog = useCallback(() => {
    setFormError(null);
    setCreateOpen(false);
    setEditEntry(null);
  }, []);

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

  useEffect(() => {
    void clinicsService.findAll().then(setClinics).catch(() => {});
  }, []);

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
      setFormError(null);

      try {
        await holidaysService.create(payload);
        setCreateOpen(false);
        await fetchEntries();
      } catch (err) {
        const msg = extractApiError(err) || 'Error al crear el feriado';
        setFormError(msg);
      } finally {
        setSubmitting(false);
      }
    },
    [fetchEntries],
  );

  const handleUpdate = useCallback(
    async (id: number, payload: UpdateHolidayPayload) => {
      setSubmitting(true);
      setFormError(null);

      try {
        await holidaysService.update(id, payload);
        setEditEntry(null);
        await fetchEntries();
      } catch (err) {
        const msg = extractApiError(err) || 'Error al actualizar el feriado';
        setFormError(msg);
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
      } catch (err) {
        const msg = extractApiError(err) || 'Error al eliminar el feriado';
        setError(msg);
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
    } catch (err) {
      const msg = extractApiError(err) || 'Error al sembrar los feriados';
      setError(msg);
    } finally {
      setSeeding(false);
    }
  }, [yearFilter, fetchEntries]);

  return {
    // Datos
    data,
    clinics,
    loading,
    error,
    formError,

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
    closeFormDialog,

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
