'use client';

import { useEffect, useState, useCallback } from 'react';
import { rolesService } from '@/services/roles.service';
import type { RoleDto, PermissionDto } from '../types';

export function useRoles() {
  const [roles, setRoles] = useState<RoleDto[]>([]);
  const [permissions, setPermissions] = useState<PermissionDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editRole, setEditRole] = useState<RoleDto | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RoleDto | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [rolesData, permsData] = await Promise.all([
        rolesService.findAll(),
        rolesService.getAllPermissions(),
      ]);
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

  const openCreateDrawer = () => {
    setEditRole(null);
    setDrawerOpen(true);
  };

  const openEditDrawer = (role: RoleDto) => {
    setEditRole(role);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setEditRole(null);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await rolesService.delete(deleteTarget.id);
      await fetchData();
    } catch {
      setError('Error al eliminar el rol');
    }
    setDeleteTarget(null);
  };

  return {
    roles,
    permissions,
    loading,
    error,
    drawerOpen,
    editRole,
    deleteTarget,
    openCreateDrawer,
    openEditDrawer,
    closeDrawer,
    setDeleteTarget,
    handleDelete,
    refreshData: fetchData,
  };
}
