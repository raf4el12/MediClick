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
  PENDING: { label: 'Pendiente', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' },
  CONFIRMED: { label: 'Confirmada', color: '#34d399', bg: 'rgba(52, 211, 153, 0.2)' },
  IN_PROGRESS: { label: 'En Curso', color: '#60a5fa', bg: 'rgba(96, 165, 250, 0.2)' },
  COMPLETED: { label: 'Completada', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' },
  CANCELLED: { label: 'Cancelada', color: '#f87171', bg: 'rgba(248, 113, 113, 0.15)' },
  NO_SHOW: { label: 'No Asistió', color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.15)' },
};

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return {
    day: date.toLocaleDateString('es-PE', { day: '2-digit', timeZone: 'UTC' }),
    month: date.toLocaleDateString('es-PE', { month: 'short', timeZone: 'UTC' }).toUpperCase(),
    full: date.toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }),
  };
};

interface Props {
  appointments: PatientRecordAppointment[];
}

export default function RecordAppointments({ appointments }: Props) {
  const theme = useTheme();
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const toggle = (id: number) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <Card sx={{ borderRadius: '24px' }}>
      <CardContent sx={{ p: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '12px',
              bgcolor: alpha(theme.palette.success.main, 0.1),
            }}
          >
            <i className="ri-calendar-check-line" style={{ fontSize: 20, color: theme.palette.success.main }} />
          </Box>
          <Typography variant="h6" fontWeight={700}>
            Historial de Citas
          </Typography>
        </Box>

        {appointments.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
            No hay citas registradas.
          </Typography>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {appointments.map((apt) => {
              const date = formatDate(apt.startTime);
              const status = statusConfig[apt.status] ?? { label: apt.status, color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.15)' };
              const doctorName = apt.schedule?.doctor
                ? `Dr. ${apt.schedule.doctor.name} ${apt.schedule.doctor.lastName}`
                : 'Doctor no asignado';
              const hasNotes = (apt.clinicalNotes?.length ?? 0) > 0;

              return (
                <Card key={apt.id} variant="outlined" sx={{ borderRadius: '16px' }}>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2,
                      p: 2,
                      cursor: hasNotes ? 'pointer' : 'default',
                    }}
                    onClick={() => hasNotes && toggle(apt.id)}
                  >
                    {/* Date block */}
                    <Box
                      sx={{
                        minWidth: 52,
                        height: 52,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '12px',
                        bgcolor: alpha(theme.palette.primary.main, 0.08),
                      }}
                    >
                      <Typography variant="caption" fontWeight={700} color="primary" lineHeight={1}>
                        {date.month}
                      </Typography>
                      <Typography variant="h6" fontWeight={800} color="primary" lineHeight={1.2}>
                        {date.day}
                      </Typography>
                    </Box>

                    {/* Info */}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" fontWeight={600} noWrap>
                        {doctorName}
                      </Typography>
                      {apt.reason && (
                        <Typography variant="caption" color="text.secondary" noWrap>
                          {apt.reason}
                        </Typography>
                      )}
                    </Box>

                    {/* Status */}
                    <Chip
                      label={status.label}
                      size="small"
                      sx={{
                        bgcolor: status.bg,
                        color: status.color,
                        fontWeight: 600,
                        fontSize: '0.75rem',
                      }}
                    />

                    {/* Expand icon */}
                    {hasNotes && (
                      <IconButton size="small">
                        <i
                          className={expandedId === apt.id ? 'ri-arrow-up-s-line' : 'ri-arrow-down-s-line'}
                          style={{ fontSize: 20 }}
                        />
                      </IconButton>
                    )}
                  </Box>

                  {/* Clinical notes */}
                  {hasNotes && (
                    <Collapse in={expandedId === apt.id}>
                      <Divider />
                      <Box sx={{ p: 2, bgcolor: alpha(theme.palette.background.default, 0.5) }}>
                        <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                          NOTAS CLÍNICAS
                        </Typography>
                        {apt.clinicalNotes!.map((note, idx) => (
                          <Box key={idx} sx={{ mb: idx < apt.clinicalNotes!.length - 1 ? 1.5 : 0 }}>
                            {note.diagnosis && (
                              <Box sx={{ mb: 0.5 }}>
                                <Typography variant="caption" color="text.secondary">
                                  Diagnóstico
                                </Typography>
                                <Typography variant="body2">{note.diagnosis}</Typography>
                              </Box>
                            )}
                            {note.plan && (
                              <Box>
                                <Typography variant="caption" color="text.secondary">
                                  Plan
                                </Typography>
                                <Typography variant="body2">{note.plan}</Typography>
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
        )}
      </CardContent>
    </Card>
  );
}
