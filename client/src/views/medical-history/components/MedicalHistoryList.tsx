'use client';

import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardActions from '@mui/material/CardActions';
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

import { useState } from 'react';

import type { MedicalHistory } from '../types';
import { MedicalHistoryStatus } from '../types';

const STATUS_CONFIG: Record<MedicalHistoryStatus, { label: string; color: 'info' | 'warning' | 'success' }> = {
  [MedicalHistoryStatus.ACTIVE]: { label: 'Activa', color: 'info' },
  [MedicalHistoryStatus.CHRONIC]: { label: 'Crónica', color: 'warning' },
  [MedicalHistoryStatus.RESOLVED]: { label: 'Resuelta', color: 'success' },
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

export function MedicalHistoryList({
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
  const [statusAnchor, setStatusAnchor] = useState<{ el: HTMLElement; entry: MedicalHistory } | null>(null);

  if (loading) {
    return (
      <Grid container spacing={2}>
        {Array.from({ length: 6 }).map((_, i) => (
          <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={i}>
            <Card variant="outlined">
              <CardContent>
                <Skeleton variant="text" width="60%" height={28} />
                <Skeleton variant="rounded" width={70} height={24} sx={{ my: 1 }} />
                <Skeleton variant="text" width="100%" />
                <Skeleton variant="text" width="40%" />
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    );
  }

  if (entries.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <i className="ri-file-list-3-line" style={{ fontSize: 48, opacity: 0.3 }} />
        <Typography variant="h6" color="text.secondary" sx={{ mt: 2 }}>
          No se encontraron entradas
        </Typography>
        <Typography variant="body2" color="text.disabled">
          Selecciona un paciente o crea una nueva entrada
        </Typography>
      </Box>
    );
  }

  return (
    <>
      <Grid container spacing={2}>
        {entries.map((entry) => {
          const statusCfg = STATUS_CONFIG[entry.status];

          return (
            <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={entry.id}>
              <Card
                variant="outlined"
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  cursor: 'pointer',
                  transition: 'all 200ms ease',
                  '&:hover': { borderColor: 'primary.main', boxShadow: 1 },
                }}
                onClick={() => onDetail(entry)}
              >
                <CardContent sx={{ flex: 1, pb: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Typography variant="subtitle1" fontWeight={600} noWrap sx={{ flex: 1, mr: 1 }}>
                      {entry.condition}
                    </Typography>
                    <Chip label={statusCfg.label} color={statusCfg.color} size="small" />
                  </Box>

                  {entry.description && (
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        mb: 1,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {entry.description}
                    </Typography>
                  )}

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 'auto' }}>
                    <i className="ri-calendar-line" style={{ fontSize: 14, opacity: 0.5 }} />
                    <Typography variant="caption" color="text.disabled">
                      {entry.diagnosedDate
                        ? new Date(entry.diagnosedDate).toLocaleDateString('es-ES')
                        : 'Sin fecha de diagnóstico'}
                    </Typography>
                  </Box>
                </CardContent>

                <CardActions sx={{ pt: 0, px: 2, pb: 1.5, justifyContent: 'flex-end' }}>
                  <Tooltip title="Editar">
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(entry);
                      }}
                    >
                      <i className="ri-pencil-line" style={{ fontSize: 18 }} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Cambiar estado">
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        setStatusAnchor({ el: e.currentTarget, entry });
                      }}
                    >
                      <i className="ri-loop-left-line" style={{ fontSize: 18 }} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Eliminar">
                    <IconButton
                      size="small"
                      color="error"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(entry);
                      }}
                    >
                      <i className="ri-delete-bin-line" style={{ fontSize: 18 }} />
                    </IconButton>
                  </Tooltip>
                </CardActions>
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
          />
        </Box>
      )}

      {/* Menú de cambio de estado */}
      <Menu
        anchorEl={statusAnchor?.el ?? null}
        open={!!statusAnchor}
        onClose={() => setStatusAnchor(null)}
      >
        {Object.entries(STATUS_CONFIG).map(([status, cfg]) => (
          <MenuItem
            key={status}
            disabled={statusAnchor?.entry.status === status}
            onClick={() => {
              if (statusAnchor) {
                onStatusChange(statusAnchor.entry.id, status as MedicalHistoryStatus);
              }
              setStatusAnchor(null);
            }}
          >
            <ListItemIcon>
              <Chip label={cfg.label} color={cfg.color} size="small" />
            </ListItemIcon>
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
