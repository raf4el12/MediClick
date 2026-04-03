'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSnackbar } from '@/hooks/useSnackbar';
import { SuccessSnackbar } from '@/components/shared/SuccessSnackbar';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import { StatusBadge } from '@/@core/components/mui/StatusBadge';
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
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import CircularProgress from '@mui/material/CircularProgress';
import { alpha, useTheme } from '@mui/material/styles';
import { useRouter } from 'next/navigation';
import { appointmentsService } from '@/services/appointments.service';
import { prescriptionsService } from '@/services/prescriptions.service';
import { AppointmentStatus } from '@/views/appointments/types';
import type { Appointment, PatientAppointmentFilters } from '@/views/appointments/types';
import type { Prescription } from '@/views/prescriptions/types';
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
  const theme = useTheme();
  const { snackbar, showSnackbar, closeSnackbar } = useSnackbar();
  const [tab, setTab] = useState<TabValue>('upcoming');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<PaginatedResponse<Appointment> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Detail dialog
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedApt, setSelectedApt] = useState<Appointment | null>(null);

  // Cancel dialog
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  // Prescription dialog
  const [prescriptionOpen, setPrescriptionOpen] = useState(false);
  const [prescription, setPrescription] = useState<Prescription | null>(null);
  const [prescriptionLoading, setPrescriptionLoading] = useState(false);
  const [prescriptionError, setPrescriptionError] = useState<string | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    setError(null);
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
      setError('No se pudieron cargar las citas. Intenta de nuevo.');
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
    setActionError(null);
    try {
      await appointmentsService.cancel(selectedApt.id, { reason: cancelReason });
      setCancelOpen(false);
      setCancelReason('');
      setDetailOpen(false);
      setSelectedApt(null);
      fetchAppointments();
      showSnackbar('Cita cancelada exitosamente', 'success');
    } catch {
      setActionError('No se pudo cancelar la cita. Intenta de nuevo.');
    } finally {
      setCancelling(false);
    }
  };

  const openDetail = (apt: Appointment) => {
    setSelectedApt(apt);
    setDetailOpen(true);
  };

  const openPrescription = async (apt: Appointment) => {
    setPrescription(null);
    setPrescriptionError(null);
    setPrescriptionLoading(true);
    setPrescriptionOpen(true);
    setSelectedApt(apt);
    try {
      const res = await prescriptionsService.getMyPrescription(apt.id);
      setPrescription(res);
    } catch {
      setPrescriptionError('No se encontró receta para esta cita.');
    } finally {
      setPrescriptionLoading(false);
    }
  };

  const closePrescription = () => {
    setPrescriptionOpen(false);
    setPrescription(null);
    setPrescriptionError(null);
  };

  const handleDownloadPdf = async () => {
    if (!selectedApt) return;
    setDownloadingPdf(true);
    try {
      await prescriptionsService.downloadMyPdf(selectedApt.id);
    } catch {
      setActionError('No se pudo descargar el PDF. Intenta de nuevo.');
    } finally {
      setDownloadingPdf(false);
    }
  };

  const canCancel = (status: AppointmentStatus) =>
    status === AppointmentStatus.PENDING || status === AppointmentStatus.CONFIRMED;

  const isCompleted = (status: AppointmentStatus) =>
    status === AppointmentStatus.COMPLETED;

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

      {/* Error alerts */}
      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {actionError && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setActionError(null)}>
          {actionError}
        </Alert>
      )}

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
                        <StatusBadge label={cfg.label} color={cfg.color} size="small" />
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
                      {isCompleted(apt.status) && (
                        <IconButton
                          size="small"
                          title="Ver Receta"
                          aria-label="Ver receta médica"
                          onClick={(e) => { e.stopPropagation(); openPrescription(apt); }}
                          sx={{ color: theme.palette.primary.main }}
                        >
                          <i className="ri-file-list-3-line" style={{ fontSize: 18 }} />
                        </IconButton>
                      )}
                      {canCancel(apt.status) && (
                        <IconButton
                          size="small"
                          color="error"
                          title="Cancelar"
                          aria-label="Cancelar cita"
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
                <IconButton size="small" aria-label="Cerrar detalle" onClick={() => setDetailOpen(false)}>
                  <i className="ri-close-line" />
                </IconButton>
              </DialogTitle>
              <DialogContent dividers>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h6" fontWeight={600}>
                      {apt.schedule.specialty.name}
                    </Typography>
                    <StatusBadge label={cfg.label} color={cfg.color} />
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
                {isCompleted(apt.status) && (
                  <Button
                    variant="contained"
                    startIcon={<i className="ri-file-list-3-line" />}
                    onClick={() => {
                      setDetailOpen(false);
                      openPrescription(apt);
                    }}
                  >
                    Ver Receta
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
          {actionError && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
              {actionError}
            </Alert>
          )}
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

      {/* Prescription Dialog */}
      <Dialog
        open={prescriptionOpen}
        onClose={closePrescription}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <i className="ri-file-list-3-line" style={{ fontSize: 22, color: theme.palette.primary.main }} />
            Receta Médica
          </Box>
          <IconButton size="small" aria-label="Cerrar receta" onClick={closePrescription}>
            <i className="ri-close-line" />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {prescriptionLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress />
            </Box>
          ) : prescriptionError ? (
            <Alert severity="info" sx={{ borderRadius: 2 }}>
              {prescriptionError}
            </Alert>
          ) : prescription ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {/* Prescription header info */}
              <Box
                sx={{
                  p: 2.5,
                  borderRadius: 2,
                  bgcolor: alpha(theme.palette.primary.main, 0.04),
                  border: '1px solid',
                  borderColor: alpha(theme.palette.primary.main, 0.12),
                }}
              >
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Especialidad</Typography>
                    <Typography variant="body1" fontWeight={600}>{prescription.specialtyName}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Doctor</Typography>
                    <Typography variant="body1" fontWeight={600}>
                      Dr. {prescription.doctor.name} {prescription.doctor.lastName}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Fecha</Typography>
                    <Typography variant="body1" fontWeight={600}>
                      {new Date(prescription.scheduleDate).toLocaleDateString('es-PE', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        timeZone: 'UTC',
                      })}
                    </Typography>
                  </Box>
                  {prescription.validUntil && (
                    <Box>
                      <Typography variant="caption" color="text.secondary">Válida hasta</Typography>
                      <Typography variant="body1" fontWeight={600}>
                        {new Date(prescription.validUntil).toLocaleDateString('es-PE', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                          timeZone: 'UTC',
                        })}
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Box>

              {/* Instructions */}
              {prescription.instructions && (
                <Box
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    bgcolor: alpha('#f59e0b', 0.06),
                    border: '1px solid',
                    borderColor: alpha('#f59e0b', 0.15),
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <i className="ri-information-line" style={{ fontSize: 18, color: '#f59e0b' }} />
                    <Typography variant="subtitle2" fontWeight={700}>
                      Indicaciones Generales
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    {prescription.instructions}
                  </Typography>
                </Box>
              )}

              {/* Medications table */}
              <Box>
                <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>
                  Medicamentos
                </Typography>
                <TableContainer sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.04) }}>
                        <TableCell sx={{ fontWeight: 700 }}>Medicamento</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Dosis</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Frecuencia</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Duración</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Notas</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {prescription.items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <Typography variant="body2" fontWeight={600}>{item.medication}</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">{item.dosage}</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">{item.frequency}</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">{item.duration}</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="text.secondary">
                              {item.notes ?? '—'}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            </Box>
          ) : null}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, justifyContent: 'space-between' }}>
          <Button onClick={closePrescription}>Cerrar</Button>
          {prescription && (
            <Button
              variant="contained"
              onClick={handleDownloadPdf}
              disabled={downloadingPdf}
              startIcon={
                downloadingPdf
                  ? <CircularProgress size={18} color="inherit" />
                  : <i className="ri-download-2-line" style={{ fontSize: 18 }} />
              }
              sx={{ textTransform: 'none' }}
            >
              {downloadingPdf ? 'Descargando...' : 'Descargar PDF'}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      <SuccessSnackbar snackbar={snackbar} onClose={closeSnackbar} />
    </Box>
  );
}
