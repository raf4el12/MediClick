'use client';

import { useEffect, useState, useCallback } from 'react';

import { doctorsService } from '@/services/doctors.service';
import { scheduleBlocksService } from '@/services/schedule-blocks.service';
import type { Doctor } from '@/views/doctors/types';
import type {
  ScheduleBlock,
  PaginatedScheduleBlocks,
  CreateScheduleBlockPayload,
  UpdateScheduleBlockPayload,
} from '../types';

const DEFAULT_DATA: PaginatedScheduleBlocks = {
  totalRows: 0,
  rows: [],
  totalPages: 1,
  currentPage: 1,
};

export function useScheduleBlocks() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);

  const [data, setData] = useState<PaginatedScheduleBlocks>(DEFAULT_DATA);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [limit] = useState(12);

  const [createOpen, setCreateOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<ScheduleBlock | null>(null);
  const [deleteEntry, setDeleteEntry] = useState<ScheduleBlock | null>(null);

  const [submitting, setSubmitting] = useState(false);

  // Cargar doctores al montar
  useEffect(() => {
    const loadDoctors = async () => {
      setLoadingDoctors(true);

      try {
        const result = await doctorsService.findAllPaginated({
          pageSize: 200,
          orderBy: 'id',
          orderByMode: 'asc',
        });

        setDoctors(result.rows);
      } catch {
        setDoctors([]);
      } finally {
        setLoadingDoctors(false);
      }
    };

    void loadDoctors();
  }, []);

  // Cargar bloqueos
  const fetchEntries = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await scheduleBlocksService.findAll({
        currentPage: page,
        pageSize: limit,
        doctorId: selectedDoctor?.id,
      });

      setData(result);
    } catch {
      setError('Error al cargar los bloqueos de horario');
      setData(DEFAULT_DATA);
    } finally {
      setLoading(false);
    }
  }, [page, limit, selectedDoctor]);

  useEffect(() => {
    void fetchEntries();
  }, [fetchEntries]);

  const handleSelectDoctor = useCallback((doctor: Doctor | null) => {
    setSelectedDoctor(doctor);
    setPage(1);
  }, []);

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  // CRUD
  const handleCreate = useCallback(
    async (payload: CreateScheduleBlockPayload) => {
      setSubmitting(true);

      try {
        await scheduleBlocksService.create(payload);
        setCreateOpen(false);
        await fetchEntries();
      } catch {
        throw new Error('Error al crear el bloqueo');
      } finally {
        setSubmitting(false);
      }
    },
    [fetchEntries],
  );

  const handleUpdate = useCallback(
    async (id: number, payload: UpdateScheduleBlockPayload) => {
      setSubmitting(true);

      try {
        await scheduleBlocksService.update(id, payload);
        setEditEntry(null);
        await fetchEntries();
      } catch {
        throw new Error('Error al actualizar el bloqueo');
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
        await scheduleBlocksService.remove(id);
        setDeleteEntry(null);
        await fetchEntries();
      } catch {
        throw new Error('Error al eliminar el bloqueo');
      } finally {
        setSubmitting(false);
      }
    },
    [fetchEntries],
  );

  return {
    // Doctores
    doctors,
    loadingDoctors,
    selectedDoctor,
    handleSelectDoctor,

    // Entradas
    data,
    loading,
    error,

    // Paginación
    page,
    limit,
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
  };
}
