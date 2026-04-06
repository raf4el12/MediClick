'use client';

import { useState } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Collapse from '@mui/material/Collapse';
import IconButton from '@mui/material/IconButton';
import Divider from '@mui/material/Divider';
import { alpha, useTheme } from '@mui/material/styles';
import type { PatientRecordAppointment } from '../types';

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  PENDING: { label: 'Pendiente', color: '#d97706', bg: 'rgba(217, 119, 6, 0.1)' },
  CONFIRMED: { label: 'Confirmada', color: '#059669', bg: 'rgba(5, 150, 105, 0.1)' },
  IN_PROGRESS: { label: 'En Curso', color: '#2563eb', bg: 'rgba(37, 99, 235, 0.1)' },
  COMPLETED: { label: 'Completada', color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)' },
  CANCELLED: { label: 'Cancelada', color: '#dc2626', bg: 'rgba(220, 38, 38, 0.1)' },
  NO_SHOW: { label: 'No Asistió', color: '#64748b', bg: 'rgba(100, 116, 139, 0.1)' },
};

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return {
    day: date.toLocaleDateString('es-PE', { day: '2-digit', timeZone: 'UTC' }),
    month: date.toLocaleDateString('es-PE', { month: 'short', timeZone: 'UTC' }).toUpperCase(),
    full: date.toLocaleDateString('es-PE', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }),
    time: date.toLocaleTimeString('es-PE', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC',
    }),
  };
};

interface Props {
  appointments: PatientRecordAppointment[];
  showNotesExpanded?: boolean;
}

export default function RecordAppointments({ appointments, showNotesExpanded }: Props) {
  const theme = useTheme();
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const toggle = (id: number) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  if (appointments.length === 0) {
    return (
      <Card sx={{ borderRadius: '16px', border: `1px solid ${theme.palette.divider}`, boxShadow: 'none' }}>
        <CardContent sx={{ py: 8, textAlign: 'center' }}>
          <i
            className={showNotesExpanded ? 'ri-file-text-line' : 'ri-calendar-check-line'}
            style={{ fontSize: 56, color: theme.palette.text.disabled }}
          />
          <Typography variant="h6" fontWeight={600} color="text.secondary" sx={{ mt: 2 }}>
            {showNotesExpanded ? 'Notas Médicas' : 'Citas'}
          </Typography>
          <Typography variant="body2" color="text.disabled" sx={{ mt: 0.5 }}>
            {showNotesExpanded
              ? 'No hay notas médicas registradas.'
              : 'No hay citas registradas.'}
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {appointments.map((apt) => {
        const date = formatDate(apt.startTime);
        const status = statusConfig[apt.status] ?? {
          label: apt.status,
          color: '#64748b',
          bg: 'rgba(100, 116, 139, 0.1)',
        };
        const doctorName = apt.schedule?.doctor
          ? `Dr. ${apt.schedule.doctor.name} ${apt.schedule.doctor.lastName}`
          : 'Doctor no asignado';
        const hasNotes = (apt.clinicalNotes?.length ?? 0) > 0;
        const isExpanded = showNotesExpanded || expandedId === apt.id;

        return (
          <Card
            key={apt.id}
            sx={{
              borderRadius: '16px',
              border: `1px solid ${theme.palette.divider}`,
              boxShadow: 'none',
              overflow: 'hidden',
              transition: 'border-color 0.2s, box-shadow 0.2s',
              '&:hover': {
                borderColor: alpha(theme.palette.primary.main, 0.3),
                boxShadow: `0 4px 20px ${alpha(theme.palette.primary.main, 0.06)}`,
              },
            }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                p: { xs: 2, md: 2.5 },
                cursor: hasNotes && !showNotesExpanded ? 'pointer' : 'default',
              }}
              onClick={() => hasNotes && !showNotesExpanded && toggle(apt.id)}
            >
              {/* Date block */}
              <Box
                sx={{
                  minWidth: 56,
                  height: 56,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '14px',
                  bgcolor: alpha(theme.palette.primary.main, 0.08),
                  flexShrink: 0,
                }}
              >
                <Typography variant="caption" fontWeight={700} color="primary" lineHeight={1} sx={{ fontSize: '0.6rem' }}>
                  {date.month}
                </Typography>
                <Typography variant="h5" fontWeight={800} color="primary" lineHeight={1.2}>
                  {date.day}
                </Typography>
              </Box>

              {/* Info */}
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body1" fontWeight={600} noWrap>
                  {doctorName}
                </Typography>
                {apt.reason && (
                  <Typography variant="body2" color="text.secondary" noWrap>
                    {apt.reason}
                  </Typography>
                )}
                <Typography variant="caption" color="text.disabled">
                  {date.full} · {date.time}
                </Typography>
              </Box>

              {/* Status */}
              <Chip
                label={status.label}
                size="small"
                sx={{
                  bgcolor: status.bg,
                  color: status.color,
                  fontWeight: 600,
                  fontSize: '0.73rem',
                  borderRadius: '8px',
                  flexShrink: 0,
                }}
              />

              {/* Expand icon */}
              {hasNotes && !showNotesExpanded && (
                <IconButton size="small" sx={{ color: theme.palette.text.secondary, flexShrink: 0 }}>
                  <i
                    className={expandedId === apt.id ? 'ri-arrow-up-s-line' : 'ri-arrow-down-s-line'}
                    style={{ fontSize: 20 }}
                  />
                </IconButton>
              )}
            </Box>

            {/* Clinical notes */}
            {hasNotes && (
              <Collapse in={isExpanded}>
                <Divider />
                <Box sx={{ p: { xs: 2, md: 2.5 }, bgcolor: alpha(theme.palette.background.default, 0.5) }}>
                  <Typography
                    variant="caption"
                    fontWeight={700}
                    color="text.secondary"
                    sx={{ mb: 1.5, display: 'block', textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '0.68rem' }}
                  >
                    Notas Clínicas
                  </Typography>
                  {apt.clinicalNotes!.map((note, idx) => (
                    <Box key={idx} sx={{ mb: idx < apt.clinicalNotes!.length - 1 ? 2 : 0 }}>
                      {note.diagnosis && (
                        <Box sx={{ mb: 1 }}>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            fontWeight={600}
                            sx={{ textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: '0.68rem' }}
                          >
                            Diagnóstico
                          </Typography>
                          <Typography variant="body2" sx={{ mt: 0.2 }}>
                            {note.diagnosis}
                          </Typography>
                        </Box>
                      )}
                      {note.plan && (
                        <Box>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            fontWeight={600}
                            sx={{ textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: '0.68rem' }}
                          >
                            Plan
                          </Typography>
                          <Typography variant="body2" sx={{ mt: 0.2 }}>
                            {note.plan}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  ))}
                </Box>
              </Collapse>
            )}
          </Card>
        );
      })}
    </Box>
  );
}
