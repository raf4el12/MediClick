'use client';

import { useEffect, useState, useCallback } from 'react';

import { patientsService } from '@/services/patients.service';
import { medicalHistoryService } from '@/services/medical-history.service';
import type { Patient } from '@/views/patients/types';
import type {
  MedicalHistory,
  PaginatedMedicalHistory,
  MedicalHistoryStatus,
  CreateMedicalHistoryPayload,
  UpdateMedicalHistoryPayload,
} from '../types';

const DEFAULT_DATA: PaginatedMedicalHistory = {
  data: [],
  total: 0,
  page: 1,
  limit: 12,
  totalPages: 1,
};

export function useMedicalHistory() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loadingPatients, setLoadingPatients] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  const [data, setData] = useState<PaginatedMedicalHistory>(DEFAULT_DATA);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [limit] = useState(12);
  const [statusFilter, setStatusFilter] = useState<MedicalHistoryStatus | ''>('');

  const [createOpen, setCreateOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<MedicalHistory | null>(null);
  const [detailEntry, setDetailEntry] = useState<MedicalHistory | null>(null);
  const [deleteEntry, setDeleteEntry] = useState<MedicalHistory | null>(null);

  const [submitting, setSubmitting] = useState(false);

  // Cargar pacientes al montar
  useEffect(() => {
    const loadPatients = async () => {
      setLoadingPatients(true);

      try {
        const result = await patientsService.findAllPaginated({
          pageSize: 200,
          orderBy: 'id',
          orderByMode: 'asc',
        });

        setPatients(result.rows);
      } catch {
        setPatients([]);
      } finally {
        setLoadingPatients(false);
      }
    };

    void loadPatients();
  }, []);

  // Cargar entradas del paciente seleccionado
  const fetchEntries = useCallback(async () => {
    if (!selectedPatient) {
      setData(DEFAULT_DATA);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params = {
        page,
        limit,
        ...(statusFilter ? { status: statusFilter as MedicalHistoryStatus } : {}),
      };
      const result = await medicalHistoryService.getByPatient(selectedPatient.id, params);

      setData(result);
    } catch {
      setError('Error al cargar el historial médico');
      setData(DEFAULT_DATA);
    } finally {
      setLoading(false);
    }
  }, [selectedPatient, page, limit, statusFilter]);

  useEffect(() => {
    void fetchEntries();
  }, [fetchEntries]);

  const handleSelectPatient = useCallback((patient: Patient | null) => {
    setSelectedPatient(patient);
    setPage(1);
    setStatusFilter('');
  }, []);

  const handleStatusFilter = useCallback((status: MedicalHistoryStatus | '') => {
    setStatusFilter(status);
    setPage(1);
  }, []);

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  // CRUD
  const handleCreate = useCallback(
    async (payload: CreateMedicalHistoryPayload) => {
      setSubmitting(true);

      try {
        await medicalHistoryService.create(payload);
        setCreateOpen(false);
        await fetchEntries();
      } catch {
        throw new Error('Error al crear la entrada');
      } finally {
        setSubmitting(false);
      }
    },
    [fetchEntries],
  );

  const handleUpdate = useCallback(
    async (id: number, payload: UpdateMedicalHistoryPayload) => {
      setSubmitting(true);

      try {
        await medicalHistoryService.update(id, payload);
        setEditEntry(null);
        await fetchEntries();
      } catch {
        throw new Error('Error al actualizar la entrada');
      } finally {
        setSubmitting(false);
      }
    },
    [fetchEntries],
  );

  const handleUpdateStatus = useCallback(
    async (id: number, status: MedicalHistoryStatus) => {
      setSubmitting(true);

      try {
        await medicalHistoryService.updateStatus(id, status);
        await fetchEntries();
      } catch {
        throw new Error('Error al cambiar el estado');
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
        await medicalHistoryService.remove(id);
        setDeleteEntry(null);
        await fetchEntries();
      } catch {
        throw new Error('Error al eliminar la entrada');
      } finally {
        setSubmitting(false);
      }
    },
    [fetchEntries],
  );

  return {
    // Pacientes
    patients,
    loadingPatients,
    selectedPatient,
    handleSelectPatient,

    // Entradas
    data,
    loading,
    error,

    // Paginación y filtros
    page,
    limit,
    statusFilter,
    handleStatusFilter,
    handlePageChange,

    // Diálogos
    createOpen,
    setCreateOpen,
    editEntry,
    setEditEntry,
    detailEntry,
    setDetailEntry,
    deleteEntry,
    setDeleteEntry,

    // CRUD
    submitting,
    handleCreate,
    handleUpdate,
    handleUpdateStatus,
    handleDelete,
  };
}
