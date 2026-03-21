'use client';

import { memo } from 'react';
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
import { alpha, useTheme } from '@mui/material/styles';

import type { ScheduleBlock } from '../types';
import { ScheduleBlockType } from '../types';

const TYPE_CONFIG: Record<
  ScheduleBlockType,
  { label: string; color: 'warning' | 'info' }
> = {
  [ScheduleBlockType.FULL_DAY]: { label: 'Día Completo', color: 'warning' },
  [ScheduleBlockType.TIME_RANGE]: { label: 'Rango Horario', color: 'info' },
};

interface ScheduleBlockListProps {
  entries: ScheduleBlock[];
  loading: boolean;
  totalPages: number;
  page: number;
  onPageChange: (page: number) => void;
  onEdit: (entry: ScheduleBlock) => void;
  onDelete: (entry: ScheduleBlock) => void;
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export const ScheduleBlockList = memo(function ScheduleBlockList({
  entries,
  loading,
  totalPages,
  page,
  onPageChange,
  onEdit,
  onDelete,
}: ScheduleBlockListProps) {
  const theme = useTheme();

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
              className="ri-calendar-close-line"
              style={{ fontSize: 32, color: theme.palette.primary.main, opacity: 0.7 }}
            />
          </Box>
          <Typography variant="h6" fontWeight={600} sx={{ mb: 0.5 }}>
            No se encontraron bloqueos
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Crea un nuevo bloqueo de horario para comenzar
          </Typography>
        </Box>
      </Card>
    );
  }

  return (
    <>
      <Grid container spacing={2.5}>
        {entries.map((entry) => {
          const typeCfg = TYPE_CONFIG[entry.type];
          const borderColor = theme.palette[typeCfg.color].main;

          return (
            <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={entry.id}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'all 200ms ease',
                  borderLeft: `3px solid ${borderColor}`,
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: `0 6px 20px ${alpha(borderColor, 0.15)}`,
                  },
                }}
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
                      {entry.reason}
                    </Typography>
                    <Chip label={typeCfg.label} color={typeCfg.color} size="small" />
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    {entry.doctor?.profile && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}>
                        <i className="ri-user-line" style={{ fontSize: 14, color: theme.palette.text.secondary }} />
                        <Typography variant="body2" color="text.secondary">
                          {entry.doctor.profile.name} {entry.doctor.profile.lastName}
                        </Typography>
                      </Box>
                    )}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}>
                      <i className="ri-calendar-line" style={{ fontSize: 14, color: theme.palette.text.secondary }} />
                      <Typography variant="body2" color="text.secondary">
                        {formatDate(entry.startDate)} — {formatDate(entry.endDate)}
                      </Typography>
                    </Box>
                    {entry.type === ScheduleBlockType.TIME_RANGE && entry.timeFrom && entry.timeTo && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                        <i className="ri-time-line" style={{ fontSize: 14, color: theme.palette.text.secondary }} />
                        <Typography variant="body2" color="text.secondary">
                          {entry.timeFrom} — {entry.timeTo}
                        </Typography>
                      </Box>
                    )}
                  </Box>

                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      mt: 'auto',
                      pt: 1.5,
                      borderTop: '1px solid',
                      borderColor: 'divider',
                    }}
                  >
                    <Box sx={{ display: 'flex', gap: 0.25 }}>
                      <Tooltip title="Editar" arrow>
                        <IconButton
                          size="small"
                          onClick={() => onEdit(entry)}
                          sx={{
                            width: 30,
                            height: 30,
                            '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.08) },
                          }}
                        >
                          <i className="ri-pencil-line" style={{ fontSize: 16 }} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Eliminar" arrow>
                        <IconButton
                          size="small"
                          onClick={() => onDelete(entry)}
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
    </>
  );
});
