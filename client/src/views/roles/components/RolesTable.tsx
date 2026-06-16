'use client';

import { memo } from 'react';
import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import Tooltip from '@mui/material/Tooltip';
import Skeleton from '@mui/material/Skeleton';
import LinearProgress from '@mui/material/LinearProgress';
import { alpha } from '@mui/material/styles';
import { StatusBadge } from '@/@core/components/mui/StatusBadge';
import { isFullAccess, moduleCount, roleVisual } from '../permissionsMeta';
import type { RoleDto } from '../types';

interface RolesTableProps {
  roles: RoleDto[];
  loading: boolean;
  error: string | null;
  totalPermissions: number;
  onAdd: () => void;
  onEdit: (role: RoleDto) => void;
  onDelete: (role: RoleDto) => void;
  onRefresh: () => void;
  onViewPermissions: (role: RoleDto) => void;
}

export const RolesTable = memo(function RolesTable({
  roles,
  loading,
  error,
  totalPermissions,
  onAdd,
  onEdit,
  onDelete,
  onRefresh,
  onViewPermissions,
}: RolesTableProps) {
  return (
    <Card>
      <Box sx={{ p: 3, pt: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Typography variant="h5" fontWeight={600}>
              Gestión de Roles
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Administra los roles y sus permisos en el sistema
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<i className="ri-add-line" />}
            onClick={onAdd}
          >
            Nuevo Rol
          </Button>
        </Box>

        {error && (
          <Alert
            severity="error"
            sx={{ mb: 2 }}
            action={
              <Button color="inherit" size="small" onClick={onRefresh}>
                Reintentar
              </Button>
            }
          >
            {error}
          </Alert>
        )}

        <TableContainer sx={{ overflowX: 'auto' }}>
          <Table sx={{ minWidth: 600 }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Rol</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Tipo</TableCell>
                <TableCell sx={{ fontWeight: 600, display: { xs: 'none', md: 'table-cell' } }}>Permisos</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="center">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton width={120} /></TableCell>
                    <TableCell><Skeleton width={80} /></TableCell>
                    <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}><Skeleton width={200} /></TableCell>
                    <TableCell align="center"><Skeleton width={80} sx={{ mx: 'auto' }} /></TableCell>
                  </TableRow>
                ))
              ) : roles.length > 0 ? (
                roles.map((role) => {
                  const visual = roleVisual(role);
                  return (
                  <TableRow key={role.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box
                          sx={{
                            width: 40,
                            height: 40,
                            borderRadius: 2,
                            flexShrink: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: (theme) => theme.palette[visual.color].main,
                            bgcolor: (theme) => alpha(theme.palette[visual.color].main, 0.12),
                          }}
                        >
                          <i className={visual.icon} style={{ fontSize: 20 }} />
                        </Box>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography fontWeight={600}>{role.name}</Typography>
                          {role.description && (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{
                                display: 'block',
                                maxWidth: 260,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {role.description}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <StatusBadge
                        label={role.isSystem ? 'Sistema' : 'Personalizado'}
                        color={role.isSystem ? 'info' : 'secondary'}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell sx={{ display: { xs: 'none', md: 'table-cell' }, minWidth: 240 }}>
                      {role.permissions.length === 0 ? (
                        <Typography variant="caption" color="text.secondary">Sin permisos</Typography>
                      ) : isFullAccess(role.permissions) ? (
                        <Chip
                          icon={<i className="ri-shield-star-line" style={{ fontSize: 14 }} />}
                          label="Acceso total"
                          size="small"
                          color="warning"
                          variant="outlined"
                          sx={{ fontWeight: 600 }}
                        />
                      ) : (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Box sx={{ flex: 1, maxWidth: 160 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                              <Typography variant="caption" color="text.secondary" fontWeight={500}>
                                {role.permissions.length} permiso{role.permissions.length !== 1 ? 's' : ''}
                              </Typography>
                              <Typography variant="caption" color="text.disabled">
                                {moduleCount(role.permissions)} módulo{moduleCount(role.permissions) !== 1 ? 's' : ''}
                              </Typography>
                            </Box>
                            <LinearProgress
                              variant="determinate"
                              value={
                                totalPermissions > 0
                                  ? Math.min(100, Math.round((role.permissions.length / totalPermissions) * 100))
                                  : 0
                              }
                              sx={{ height: 6, borderRadius: 3 }}
                            />
                          </Box>
                          <Tooltip title="Ver permisos">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => onViewPermissions(role)}
                              aria-label="Ver permisos del rol"
                            >
                              <i className="ri-eye-line" style={{ fontSize: 18 }} />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      )}
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                        <Tooltip title={role.isSystem ? 'Los roles de sistema no se pueden editar' : 'Editar rol'}>
                          <span>
                            <IconButton
                              size="small"
                              color="info"
                              disabled={role.isSystem}
                              onClick={() => onEdit(role)}
                              aria-label="Editar rol"
                              sx={{ minWidth: 44, minHeight: 44 }}
                            >
                              <i className="ri-pencil-line" style={{ fontSize: 18 }} />
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip title={role.isSystem ? 'Los roles de sistema no se pueden eliminar' : 'Eliminar rol'}>
                          <span>
                            <IconButton
                              size="small"
                              color="error"
                              disabled={role.isSystem}
                              onClick={() => onDelete(role)}
                              aria-label="Eliminar rol"
                              sx={{ minWidth: 44, minHeight: 44 }}
                            >
                              <i className="ri-delete-bin-line" style={{ fontSize: 18 }} />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={4} sx={{ textAlign: 'center', py: 6 }}>
                    <i className="ri-shield-user-line" style={{ fontSize: 48, display: 'block', marginBottom: 8 }} />
                    <Typography color="text.secondary" sx={{ mb: 2 }}>
                      No hay roles disponibles
                    </Typography>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<i className="ri-add-line" />}
                      onClick={onAdd}
                    >
                      Crear rol
                    </Button>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </Card>
  );
});
