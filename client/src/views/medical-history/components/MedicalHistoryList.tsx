'use client';

import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Skeleton from '@mui/material/Skeleton';
import Pagination from '@mui/material/Pagination';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import { alpha, useTheme } from '@mui/material/styles';

import { memo, useState } from 'react';

import type { MedicalHistory } from '../types';
import { MedicalHistoryStatus } from '../types';

const STATUS_CONFIG: Record<
  MedicalHistoryStatus,
  { label: string; color: 'info' | 'warning' | 'success'; icon: string }
> = {
  [MedicalHistoryStatus.ACTIVE]: { label: 'Activa', color: 'info', icon: 'ri-pulse-line' },
  [MedicalHistoryStatus.CHRONIC]: { label: 'Crónica', color: 'warning', icon: 'ri-heart-pulse-line' },
  [MedicalHistoryStatus.RESOLVED]: { label: 'Resuelta', color: 'success', icon: 'ri-check-double-line' },
};

interface MedicalHistoryListProps {
  entries: MedicalHistory[];
  loading: boolean;
  totalPages: number;
  page: number;
  onPageChange: (page: number) => void;
  onDetail: (entry: MedicalHistory) => void;
  onEdit: (entry: MedicalHistory) => void;
  onStatusChange: (id: number, status: MedicalHistoryStatus) => void;
  onDelete: (entry: MedicalHistory) => void;
}

export const MedicalHistoryList = memo(function MedicalHistoryList({
  entries,
  loading,
  totalPages,
  page,
  onPageChange,
  onDetail,
  onEdit,
  onStatusChange,
  onDelete,
}: MedicalHistoryListProps) {
  const theme = useTheme();
  const [statusAnchor, setStatusAnchor] = useState<{ el: HTMLElement; entry: MedicalHistory } | null>(null);

  if (loading) {
    return (
      <Grid container spacing={2.5}>
        {Array.from({ length: 6 }).map((_, i) => (
          <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={i}>
            <Card>
              <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                  <Skeleton variant="text" width="55%" height={26} />
                  <Skeleton variant="rounded" width={68} height={24} sx={{ borderRadius: 1 }} />
                </Box>
                <Skeleton variant="text" width="100%" />
                <Skeleton variant="text" width="80%" />
                <Skeleton variant="text" width="35%" sx={{ mt: 1.5 }} />
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    );
  }

  if (entries.length === 0) {
    return (
      <Card>
        <Box
          sx={{
            textAlign: 'center',
            py: 10,
            px: 3,
          }}
        >
          <Box
            sx={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              bgcolor: alpha(theme.palette.primary.main, 0.08),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mx: 'auto',
              mb: 2.5,
            }}
          >
            <i
              className="ri-file-list-3-line"
              style={{ fontSize: 32, color: theme.palette.primary.main, opacity: 0.7 }}
            />
          </Box>
          <Typography variant="h6" fontWeight={600} sx={{ mb: 0.5 }}>
            No se encontraron entradas
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Selecciona un paciente o crea una nueva entrada para comenzar
          </Typography>
        </Box>
      </Card>
    );
  }

  return (
    <>
      <Grid container spacing={2.5}>
        {entries.map((entry) => {
          const statusCfg = STATUS_CONFIG[entry.status];
          const statusColor = theme.palette[statusCfg.color].main;

          return (
            <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={entry.id}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  cursor: 'pointer',
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'all 200ms ease',
                  borderLeft: `3px solid ${statusColor}`,
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: `0 6px 20px ${alpha(statusColor, 0.15)}`,
                  },
                }}
                onClick={() => onDetail(entry)}
              >
                <CardContent sx={{ flex: 1, p: 2.5, '&:last-child': { pb: 2.5 } }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                    <Typography
                      variant="subtitle1"
                      fontWeight={600}
                      sx={{
                        flex: 1,
                        mr: 1,
                        display: '-webkit-box',
                        WebkitLineClamp: 1,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {entry.condition}
                    </Typography>
                    <Chip label={statusCfg.label} color={statusCfg.color} size="small" />
                  </Box>

                  {entry.description ? (
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        mb: 2,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        lineHeight: 1.6,
                      }}
                    >
                      {entry.description}
                    </Typography>
                  ) : (
                    <Typography variant="body2" color="text.disabled" sx={{ mb: 2, fontStyle: 'italic' }}>
                      Sin descripción
                    </Typography>
                  )}

                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      mt: 'auto',
                      pt: 1.5,
                      borderTop: '1px solid',
                      borderColor: 'divider',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                      <i className="ri-calendar-line" style={{ fontSize: 14, color: theme.palette.text.disabled }} />
                      <Typography variant="caption" color="text.disabled">
                        {entry.diagnosedDate
                          ? new Date(entry.diagnosedDate).toLocaleDateString('es-ES', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })
                          : 'Sin fecha'}
                      </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', gap: 0.25 }}>
                      <Tooltip title="Editar" arrow>
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEdit(entry);
                          }}
                          sx={{
                            width: 30,
                            height: 30,
                            '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.08) },
                          }}
                        >
                          <i className="ri-pencil-line" style={{ fontSize: 16 }} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Cambiar estado" arrow>
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            setStatusAnchor({ el: e.currentTarget, entry });
                          }}
                          sx={{
                            width: 30,
                            height: 30,
                            '&:hover': { bgcolor: alpha(theme.palette.warning.main, 0.08) },
                          }}
                        >
                          <i className="ri-loop-left-line" style={{ fontSize: 16 }} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Eliminar" arrow>
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete(entry);
                          }}
                          sx={{
                            width: 30,
                            height: 30,
                            color: 'text.secondary',
                            '&:hover': { bgcolor: alpha(theme.palette.error.main, 0.08), color: 'error.main' },
                          }}
                        >
                          <i className="ri-delete-bin-line" style={{ fontSize: 16 }} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={(_, value) => onPageChange(value)}
            color="primary"
            shape="rounded"
          />
        </Box>
      )}

      <Menu
        anchorEl={statusAnchor?.el ?? null}
        open={!!statusAnchor}
        onClose={() => setStatusAnchor(null)}
        slotProps={{ paper: { sx: { minWidth: 160, mt: 0.5 } } }}
      >
        <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ px: 2, py: 0.75, display: 'block' }}>
          Cambiar estado a
        </Typography>
        {Object.entries(STATUS_CONFIG).map(([status, cfg]) => {
          const isActive = statusAnchor?.entry.status === status;

          return (
            <MenuItem
              key={status}
              disabled={isActive}
              onClick={() => {
                if (statusAnchor) {
                  onStatusChange(statusAnchor.entry.id, status as MedicalHistoryStatus);
                }
                setStatusAnchor(null);
              }}
              sx={{ gap: 1.5, py: 1 }}
            >
              <ListItemIcon sx={{ minWidth: 'auto !important' }}>
                <Chip label={cfg.label} color={cfg.color} size="small" />
              </ListItemIcon>
              {isActive && (
                <Typography variant="caption" color="text.disabled" sx={{ ml: 'auto' }}>
                  Actual
                </Typography>
              )}
            </MenuItem>
          );
        })}
      </Menu>
    </>
  );
});
