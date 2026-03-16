'use client';

import { useState, useEffect, useCallback } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Skeleton from '@mui/material/Skeleton';
import Alert from '@mui/material/Alert';
import Pagination from '@mui/material/Pagination';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import IconButton from '@mui/material/IconButton';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import { useRouter } from 'next/navigation';
import { appointmentsService } from '@/services/appointments.service';
import { AppointmentStatus } from '@/views/appointments/types';
import type { Appointment, PatientAppointmentFilters } from '@/views/appointments/types';
import type { PaginatedResponse } from '@/types/pagination.types';

const statusConfig: Record<string, { label: string; color: 'warning' | 'info' | 'primary' | 'success' | 'error' | 'default' }> = {
  [AppointmentStatus.PENDING]: { label: 'Pendiente', color: 'warning' },
  [AppointmentStatus.CONFIRMED]: { label: 'Confirmada', color: 'info' },
  [AppointmentStatus.IN_PROGRESS]: { label: 'En Curso', color: 'primary' },
  [AppointmentStatus.COMPLETED]: { label: 'Completada', color: 'success' },
  [AppointmentStatus.CANCELLED]: { label: 'Cancelada', color: 'error' },
  [AppointmentStatus.NO_SHOW]: { label: 'No Asistió', color: 'default' },
};

type TabValue = 'upcoming' | 'all' | 'past';

export default function PatientAppointmentsView() {
  const router = useRouter();
  const [tab, setTab] = useState<TabValue>('upcoming');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<PaginatedResponse<Appointment> | null>(null);
  const [loading, setLoading] = useState(true);

  // Detail dialog
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedApt, setSelectedApt] = useState<Appointment | null>(null);

  // Cancel dialog
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  // Confirm action
  const [confirming, setConfirming] = useState(false);

  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    try {
      const filters: PatientAppointmentFilters = {};
      if (tab === 'upcoming') filters.upcoming = true;
      if (tab === 'past') filters.status = AppointmentStatus.COMPLETED;

      const res = await appointmentsService.getMyAppointments(
        { currentPage: page, pageSize: 10, orderBy: 'createdAt', orderByMode: 'desc' },
        filters,
      );
      setData(res);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [tab, page]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const handleTabChange = (_: unknown, val: TabValue | null) => {
    if (val) {
      setTab(val);
      setPage(1);
    }
  };

  const handleCancel = async () => {
    if (!selectedApt) return;
    setCancelling(true);
    try {
      await appointmentsService.cancel(selectedApt.id, { reason: cancelReason });
      setCancelOpen(false);
      setCancelReason('');
      setDetailOpen(false);
      setSelectedApt(null);
      fetchAppointments();
    } catch {
      // handle error
    } finally {
      setCancelling(false);
    }
  };

  const handleConfirm = async (apt: Appointment) => {
    setConfirming(true);
    try {
      await appointmentsService.confirm(apt.id);
      fetchAppointments();
      if (detailOpen && selectedApt?.id === apt.id) {
        setSelectedApt({ ...apt, status: AppointmentStatus.CONFIRMED });
      }
    } catch {
      // handle error
    } finally {
      setConfirming(false);
    }
  };

  const openDetail = (apt: Appointment) => {
    setSelectedApt(apt);
    setDetailOpen(true);
  };

  const canCancel = (status: AppointmentStatus) =>
    status === AppointmentStatus.PENDING || status === AppointmentStatus.CONFIRMED;

  const canConfirm = (status: AppointmentStatus) =>
    status === AppointmentStatus.PENDING;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="h6" fontWeight={700}>
          Mis Citas
        </Typography>
        <Button
          variant="contained"
          size="small"
          startIcon={<i className="ri-add-line" />}
          onClick={() => router.push('/patient/book')}
        >
          Nueva Cita
        </Button>
      </Box>

      {/* Tabs */}
      <ToggleButtonGroup
        value={tab}
        exclusive
        onChange={handleTabChange}
        size="small"
        sx={{ mb: 2, flexWrap: 'wrap' }}
      >
        <ToggleButton value="upcoming">Próximas</ToggleButton>
        <ToggleButton value="all">Todas</ToggleButton>
        <ToggleButton value="past">Completadas</ToggleButton>
      </ToggleButtonGroup>

      {/* List */}
      {loading ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} variant="rounded" height={100} />
          ))}
        </Box>
      ) : !data || data.rows.length === 0 ? (
        <Alert severity="info" sx={{ borderRadius: 2 }}>
          No se encontraron citas en esta categoría.
        </Alert>
      ) : (
        <>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {data.rows.map((apt) => {
              const cfg = statusConfig[apt.status] ?? { label: apt.status, color: 'default' as const };
              const schedDate = new Date(apt.schedule.scheduleDate);

              return (
                <Card
                  key={apt.id}
                  variant="outlined"
                  sx={{
                    borderRadius: 2,
                    cursor: 'pointer',
                    transition: 'box-shadow 0.2s',
                    '&:hover': { boxShadow: 3 },
                  }}
                  onClick={() => openDetail(apt)}
                >
                  <CardContent sx={{ display: 'flex', gap: 2, alignItems: 'center', py: '12px !important' }}>
                    {/* Date */}
                    <Box
                      sx={{
                        width: 52,
                        height: 52,
                        borderRadius: 2,
                        bgcolor: 'primary.main',
                        color: 'primary.contrastText',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <Typography variant="caption" fontWeight={700} lineHeight={1} sx={{ fontSize: '0.65rem' }}>
                        {schedDate.toLocaleDateString('es-PE', { month: 'short', timeZone: 'UTC' }).toUpperCase()}
                      </Typography>
                      <Typography variant="h6" fontWeight={700} lineHeight={1.2}>
                        {schedDate.toLocaleDateString('es-PE', { day: 'numeric', timeZone: 'UTC' })}
                      </Typography>
                    </Box>

                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="subtitle2" fontWeight={600} noWrap sx={{ flex: 1 }}>
                          {apt.schedule.specialty.name}
                        </Typography>
                        <Chip label={cfg.label} color={cfg.color} size="small" />
                      </Box>
                      <Typography variant="body2" color="text.secondary" noWrap>
                        Dr. {apt.schedule.doctor.name} {apt.schedule.doctor.lastName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {apt.startTime} - {apt.endTime}
                      </Typography>
                    </Box>

                    {/* Actions */}
                    <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
                      {canConfirm(apt.status) && (
                        <IconButton
                          size="small"
                          color="success"
                          title="Confirmar"
                          onClick={(e) => { e.stopPropagation(); handleConfirm(apt); }}
                          disabled={confirming}
                        >
                          <i className="ri-check-line" style={{ fontSize: 18 }} />
                        </IconButton>
                      )}
                      {canCancel(apt.status) && (
                        <IconButton
                          size="small"
                          color="error"
                          title="Cancelar"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedApt(apt);
                            setCancelOpen(true);
                          }}
                        >
                          <i className="ri-close-line" style={{ fontSize: 18 }} />
                        </IconButton>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              );
            })}
          </Box>

          {data.totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
              <Pagination
                count={data.totalPages}
                page={page}
                onChange={(_, p) => setPage(p)}
                color="primary"
                size="small"
              />
            </Box>
          )}
        </>
      )}

      {/* Detail Dialog */}
      <Dialog
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        {selectedApt && (() => {
          const apt = selectedApt;
          const cfg = statusConfig[apt.status] ?? { label: apt.status, color: 'default' as const };
          const schedDate = new Date(apt.schedule.scheduleDate);

          return (
            <>
              <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                Detalle de Cita
                <IconButton size="small" onClick={() => setDetailOpen(false)}>
                  <i className="ri-close-line" />
                </IconButton>
              </DialogTitle>
              <DialogContent dividers>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h6" fontWeight={600}>
                      {apt.schedule.specialty.name}
                    </Typography>
                    <Chip label={cfg.label} color={cfg.color} />
                  </Box>

                  <Divider />

                  <Box>
                    <Typography variant="caption" color="text.secondary">Doctor</Typography>
                    <Typography variant="body1" fontWeight={500}>
                      Dr. {apt.schedule.doctor.name} {apt.schedule.doctor.lastName}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography variant="caption" color="text.secondary">Fecha y Hora</Typography>
                    <Typography variant="body1">
                      {schedDate.toLocaleDateString('es-PE', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        timeZone: 'UTC',
                      })}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {apt.startTime} - {apt.endTime}
                    </Typography>
                  </Box>

                  {apt.reason && (
                    <Box>
                      <Typography variant="caption" color="text.secondary">Motivo</Typography>
                      <Typography variant="body1">{apt.reason}</Typography>
                    </Box>
                  )}

                  {apt.notes && (
                    <Box>
                      <Typography variant="caption" color="text.secondary">Notas</Typography>
                      <Typography variant="body1">{apt.notes}</Typography>
                    </Box>
                  )}

                  {apt.cancelReason && (
                    <Box>
                      <Typography variant="caption" color="text.secondary">Motivo de Cancelación</Typography>
                      <Typography variant="body1" color="error.main">{apt.cancelReason}</Typography>
                    </Box>
                  )}
                </Box>
              </DialogContent>
              <DialogActions sx={{ px: 3, py: 2 }}>
                {canConfirm(apt.status) && (
                  <Button
                    variant="contained"
                    color="success"
                    onClick={() => handleConfirm(apt)}
                    disabled={confirming}
                  >
                    Confirmar Cita
                  </Button>
                )}
                {canCancel(apt.status) && (
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={() => setCancelOpen(true)}
                  >
                    Cancelar Cita
                  </Button>
                )}
              </DialogActions>
            </>
          );
        })()}
      </Dialog>

      {/* Cancel Dialog */}
      <Dialog
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Cancelar Cita</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Por favor indica el motivo de la cancelación.
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Motivo de cancelación"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelOpen(false)}>Volver</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleCancel}
            disabled={cancelling || !cancelReason.trim()}
          >
            Cancelar Cita
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
