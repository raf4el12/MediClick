'use client';

import { useEffect, useMemo, useState } from 'react';
import Drawer from '@mui/material/Drawer';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Divider from '@mui/material/Divider';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Chip from '@mui/material/Chip';
import { rolesService } from '@/services/roles.service';
import type { RoleDto, PermissionDto, PermissionGroup } from '../types';

const SUBJECT_LABELS: Record<string, string> = {
  ALL: 'Todos (Wildcard)',
  APPOINTMENTS: 'Citas',
  AVAILABILITY: 'Disponibilidad',
  CATEGORIES: 'Categorías',
  CLINICS: 'Sedes',
  CLINICAL_NOTES: 'Notas Clínicas',
  DOCTORS: 'Doctores',
  HOLIDAYS: 'Feriados',
  MEDICAL_HISTORY: 'Historial Médico',
  NOTIFICATIONS: 'Notificaciones',
  PATIENTS: 'Pacientes',
  PRESCRIPTIONS: 'Recetas',
  REPORTS: 'Reportes',
  ROLES: 'Roles',
  SCHEDULES: 'Horarios',
  SCHEDULE_BLOCKS: 'Bloqueos',
  SPECIALTIES: 'Especialidades',
  USERS: 'Usuarios',
};

const ACTION_LABELS: Record<string, string> = {
  CREATE: 'Crear',
  READ: 'Leer',
  UPDATE: 'Editar',
  DELETE: 'Eliminar',
  MANAGE: 'Gestionar',
};

const ACTION_COLORS: Record<string, 'success' | 'info' | 'warning' | 'error' | 'primary'> = {
  CREATE: 'success',
  READ: 'info',
  UPDATE: 'warning',
  DELETE: 'error',
  MANAGE: 'primary',
};

function groupPermissions(permissions: PermissionDto[]): PermissionGroup[] {
  const map = new Map<string, PermissionGroup>();

  for (const p of permissions) {
    const group = map.get(p.subject);
    if (group) {
      group.permissions.push({ id: p.id, action: p.action, description: p.description });
    } else {
      map.set(p.subject, {
        subject: p.subject,
        permissions: [{ id: p.id, action: p.action, description: p.description }],
      });
    }
  }

  // Ordenar: ALL primero, luego alfabéticamente
  return Array.from(map.values()).sort((a, b) => {
    if (a.subject === 'ALL') return -1;
    if (b.subject === 'ALL') return 1;
    return a.subject.localeCompare(b.subject);
  });
}

interface RoleFormDrawerProps {
  open: boolean;
  editRole: RoleDto | null;
  permissions: PermissionDto[];
  onClose: () => void;
  onSuccess: () => void;
}

export function RoleFormDrawer({ open, editRole, permissions, onClose, onSuccess }: RoleFormDrawerProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const groups = useMemo(() => groupPermissions(permissions), [permissions]);

  useEffect(() => {
    if (open) {
      if (editRole) {
        setName(editRole.name);
        setDescription(editRole.description ?? '');
        setSelectedIds(new Set(editRole.permissions.map((p) => p.id)));
      } else {
        setName('');
        setDescription('');
        setSelectedIds(new Set());
      }
      setError(null);
    }
  }, [open, editRole]);

  const togglePermission = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSubjectAll = (group: PermissionGroup) => {
    const groupIds = group.permissions.map((p) => p.id);
    const allSelected = groupIds.every((id) => selectedIds.has(id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        groupIds.forEach((id) => next.delete(id));
      } else {
        groupIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('El nombre del rol es obligatorio');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || undefined,
        permissionIds: Array.from(selectedIds),
      };

      if (editRole) {
        await rolesService.update(editRole.id, payload);
      } else {
        await rolesService.create(payload);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      setError(typeof msg === 'string' ? msg : Array.isArray(msg) ? msg[0] : 'Error al guardar el rol');
    } finally {
      setSaving(false);
    }
  };

  const selectedCount = selectedIds.size;

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { width: { xs: '100%', sm: 480 } } }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 3, pb: 2 }}>
          <Box>
            <Typography variant="h6" fontWeight={600}>
              {editRole ? 'Editar Rol' : 'Nuevo Rol'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {selectedCount} permiso{selectedCount !== 1 ? 's' : ''} seleccionado{selectedCount !== 1 ? 's' : ''}
            </Typography>
          </Box>
          <IconButton onClick={onClose} aria-label="Cerrar">
            <i className="ri-close-line" style={{ fontSize: 20 }} />
          </IconButton>
        </Box>

        <Divider />

        {/* Body */}
        <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <TextField
            label="Nombre del rol"
            fullWidth
            value={name}
            onChange={(e) => setName(e.target.value)}
            sx={{ mb: 2 }}
            placeholder="Ej: Enfermero, Asistente"
          />

          <TextField
            label="Descripción (opcional)"
            fullWidth
            multiline
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            sx={{ mb: 3 }}
            placeholder="Breve descripción del rol"
          />

          <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1.5 }}>
            Permisos
          </Typography>

          {groups.map((group) => {
            const groupIds = group.permissions.map((p) => p.id);
            const selectedInGroup = groupIds.filter((id) => selectedIds.has(id)).length;
            const allSelected = selectedInGroup === groupIds.length;
            const someSelected = selectedInGroup > 0 && !allSelected;

            return (
              <Accordion
                key={group.subject}
                disableGutters
                elevation={0}
                sx={{
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: '8px !important',
                  mb: 1,
                  '&:before': { display: 'none' },
                  overflow: 'hidden',
                }}
              >
                <AccordionSummary
                  expandIcon={<i className="ri-arrow-down-s-line" style={{ fontSize: 18 }} />}
                  sx={{ minHeight: 48, '& .MuiAccordionSummary-content': { alignItems: 'center', gap: 1 } }}
                >
                  <Checkbox
                    checked={allSelected}
                    indeterminate={someSelected}
                    onChange={() => toggleSubjectAll(group)}
                    onClick={(e) => e.stopPropagation()}
                    size="small"
                  />
                  <Typography variant="body2" fontWeight={600}>
                    {SUBJECT_LABELS[group.subject] ?? group.subject}
                  </Typography>
                  {selectedInGroup > 0 && (
                    <Chip
                      label={`${selectedInGroup}/${groupIds.length}`}
                      size="small"
                      color="primary"
                      variant="outlined"
                      sx={{ fontSize: '0.7rem', height: 22, ml: 'auto', mr: 1 }}
                    />
                  )}
                </AccordionSummary>
                <AccordionDetails sx={{ pt: 0, pb: 1.5, pl: 4 }}>
                  {group.permissions.map((perm) => (
                    <FormControlLabel
                      key={perm.id}
                      sx={{ display: 'flex', mb: 0.25, '& .MuiFormControlLabel-label': { fontSize: '0.85rem' } }}
                      control={
                        <Checkbox
                          checked={selectedIds.has(perm.id)}
                          onChange={() => togglePermission(perm.id)}
                          size="small"
                        />
                      }
                      label={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Chip
                            label={ACTION_LABELS[perm.action] ?? perm.action}
                            size="small"
                            color={ACTION_COLORS[perm.action] ?? 'default'}
                            sx={{ fontSize: '0.7rem', height: 22, minWidth: 70 }}
                          />
                        </Box>
                      }
                    />
                  ))}
                </AccordionDetails>
              </Accordion>
            );
          })}
        </Box>

        {/* Footer */}
        <Divider />
        <Box sx={{ p: 3, display: 'flex', gap: 2 }}>
          <Button variant="outlined" fullWidth onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            fullWidth
            onClick={handleSubmit}
            disabled={saving}
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            {saving ? 'Guardando...' : editRole ? 'Actualizar' : 'Crear Rol'}
          </Button>
        </Box>
      </Box>
    </Drawer>
  );
}
