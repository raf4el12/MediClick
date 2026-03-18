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

import type { Holiday } from '../types';
import type { Clinic } from '@/views/clinics/types';

interface HolidayListProps {
  entries: Holiday[];
  clinics: Clinic[];
  loading: boolean;
  totalPages: number;
  page: number;
  onPageChange: (page: number) => void;
  onEdit: (entry: Holiday) => void;
  onDelete: (entry: Holiday) => void;
}

export const HolidayList = memo(function HolidayList({
  entries,
  clinics,
  loading,
  totalPages,
  page,
  onPageChange,
  onEdit,
  onDelete,
}: HolidayListProps) {
  const clinicMap = new Map(clinics.map((c) => [c.id, c.name]));
  const theme = useTheme();

  if (loading) {
    return (
      <Grid container spacing={2.5}>
        {Array.from({ length: 4 }).map((_, i) => (
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
              className="ri-calendar-event-line"
              style={{ fontSize: 32, color: theme.palette.primary.main, opacity: 0.7 }}
            />
          </Box>
          <Typography variant="h6" fontWeight={600} sx={{ mb: 0.5 }}>
            No se encontraron feriados
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Siembra feriados o crea uno personalizado
          </Typography>
        </Box>
      </Card>
    );
  }

  return (
    <>
      <Grid container spacing={2.5}>
        {entries.map((entry) => {
          const isRecurring = entry.isRecurring;
          const borderColor = isRecurring ? theme.palette.info.main : theme.palette.warning.main;

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
                      {entry.name}
                    </Typography>
                    <Chip
                      label={isRecurring ? 'Recurrente' : 'Personalizado'}
                      color={isRecurring ? 'info' : 'warning'}
                      size="small"
                    />
                  </Box>

                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                      mb: 0.5,
                      lineHeight: 1.6,
                    }}
                  >
                    {new Date(entry.date).toLocaleDateString('es-ES', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                      timeZone: 'UTC',
                    })}
                  </Typography>
                  <Chip
                    label={entry.clinicId ? clinicMap.get(entry.clinicId) ?? 'Sede' : 'Global'}
                    size="small"
                    variant="outlined"
                    color={entry.clinicId ? 'secondary' : 'default'}
                    sx={{ mb: 1 }}
                  />

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
