'use client';

import { useEffect, useState, useCallback } from 'react';
import { rolesService } from '@/services/roles.service';
import { extractApiError } from '@/utils/extractApiError';
import type { RoleDto, PermissionDto } from '../types';

export function useRoles() {
  const [roles, setRoles] = useState<RoleDto[]>([]);
  const [permissions, setPermissions] = useState<PermissionDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RoleDto | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [rolesData, permsData] = await Promise.all([rolesService.findAll(), rolesService.getAllPermissions()]);
      setRoles(rolesData);
      setPermissions(permsData);
    } catch {
      setError('Error al cargar roles y permisos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  /** Borra el rol elegido; devuelve si se pudo. */
  const handleDelete = async (): Promise<boolean> => {
    if (!deleteTarget) return false;
    try {
      await rolesService.delete(deleteTarget.id);
      await fetchData();
      return true;
    } catch (err) {
      setError(extractApiError(err, 'Error al eliminar el rol').message);
      return false;
    } finally {
      setDeleteTarget(null);
    }
  };

  return {
    roles,
    permissions,
    loading,
    error,
    deleteTarget,
    setDeleteTarget,
    handleDelete,
    refreshData: fetchData,
  };
}
