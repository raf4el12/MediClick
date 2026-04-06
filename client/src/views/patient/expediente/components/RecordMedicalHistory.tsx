'use client';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import { alpha, useTheme } from '@mui/material/styles';
import type { PatientRecordMedicalHistory } from '../types';

const statusConfig: Record<string, { label: string; color: 'success' | 'warning' | 'info'; icon: string }> = {
  ACTIVE: { label: 'Activo', color: 'warning', icon: 'ri-error-warning-line' },
  CHRONIC: { label: 'Crónico', color: 'info', icon: 'ri-heart-pulse-line' },
  RESOLVED: { label: 'Resuelto', color: 'success', icon: 'ri-check-line' },
};

interface Props {
  history: PatientRecordMedicalHistory[];
}

function formatDiagnosedDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('es-PE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export default function RecordMedicalHistory({ history }: Props) {
  const theme = useTheme();

  if (history.length === 0) {
    return (
      <Card sx={{ borderRadius: '16px', border: `1px solid ${theme.palette.divider}`, boxShadow: 'none' }}>
        <CardContent sx={{ py: 8, textAlign: 'center' }}>
          <i className="ri-file-list-3-line" style={{ fontSize: 56, color: theme.palette.text.disabled }} />
          <Typography variant="h6" fontWeight={600} color="text.secondary" sx={{ mt: 2 }}>
            Historial Médico
          </Typography>
          <Typography variant="body2" color="text.disabled" sx={{ mt: 0.5 }}>
            No hay historial médico registrado.
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Grid container spacing={2}>
      {history.map((item, index) => {
        const config = statusConfig[item.status ?? ''] ?? {
          label: item.status ?? 'Sin estado',
          color: 'info' as const,
          icon: 'ri-information-line',
        };

        return (
          <Grid key={index} size={{ xs: 12, md: 6 }}>
            <Card
              sx={{
                borderRadius: '16px',
                height: '100%',
                border: `1px solid ${theme.palette.divider}`,
                boxShadow: 'none',
                transition: 'border-color 0.2s, box-shadow 0.2s',
                '&:hover': {
                  borderColor: alpha(theme.palette[config.color].main, 0.4),
                  boxShadow: `0 4px 20px ${alpha(theme.palette[config.color].main, 0.08)}`,
                },
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1, mb: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                    <Box
                      sx={{
                        width: 36,
                        height: 36,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '10px',
                        bgcolor: alpha(theme.palette[config.color].main, 0.1),
                        flexShrink: 0,
                      }}
                    >
                      <i className={config.icon} style={{ fontSize: 18, color: theme.palette[config.color].main }} />
                    </Box>
                    <Typography variant="body1" fontWeight={700}>
                      {item.condition}
                    </Typography>
                  </Box>
                  <Chip
                    label={config.label}
                    size="small"
                    color={config.color}
                    variant="outlined"
                    sx={{ fontWeight: 600, fontSize: '0.7rem', borderRadius: '8px', flexShrink: 0 }}
                  />
                </Box>

                {item.description && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1, ml: 6 }}>
                    {item.description}
                  </Typography>
                )}

                {item.notes && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, ml: 6, fontStyle: 'italic' }}>
                    {item.notes}
                  </Typography>
                )}

                {item.diagnosedDate && (
                  <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 1.5, ml: 6 }}>
                    <i className="ri-calendar-line" style={{ fontSize: 12, marginRight: 4, verticalAlign: 'middle' }} />
                    Diagnosticado: {formatDiagnosedDate(item.diagnosedDate)}
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        );
      })}
    </Grid>
  );
}
