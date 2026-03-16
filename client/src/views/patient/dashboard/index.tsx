'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardActionArea from '@mui/material/CardActionArea';
import Chip from '@mui/material/Chip';
import Skeleton from '@mui/material/Skeleton';
import Alert from '@mui/material/Alert';
import { useAppSelector } from '@/redux-store/hooks';
import { selectUser } from '@/redux-store/slices/auth';
import { appointmentsService } from '@/services/appointments.service';
import { AppointmentStatus } from '@/views/appointments/types';
import type { Appointment } from '@/views/appointments/types';

const statusConfig: Record<string, { label: string; color: 'warning' | 'info' | 'primary' | 'success' | 'error' | 'default' }> = {
  [AppointmentStatus.PENDING]: { label: 'Pendiente', color: 'warning' },
  [AppointmentStatus.CONFIRMED]: { label: 'Confirmada', color: 'info' },
  [AppointmentStatus.IN_PROGRESS]: { label: 'En Curso', color: 'primary' },
  [AppointmentStatus.COMPLETED]: { label: 'Completada', color: 'success' },
  [AppointmentStatus.CANCELLED]: { label: 'Cancelada', color: 'error' },
  [AppointmentStatus.NO_SHOW]: { label: 'No Asistió', color: 'default' },
};

export default function PatientDashboardView() {
  const router = useRouter();
  const user = useAppSelector(selectUser);
  const [upcoming, setUpcoming] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await appointmentsService.getMyAppointments(
          { pageSize: 3, orderBy: 'createdAt', orderByMode: 'desc' },
          { upcoming: true },
        );
        setUpcoming(res.rows);
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buenos días';
    if (hour < 18) return 'Buenas tardes';
    return 'Buenas noches';
  };

  return (
    <Box>
      {/* Greeting */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>
          {greeting()}, {user?.name?.split(' ')[0]} 👋
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Bienvenido a tu portal de salud
        </Typography>
      </Box>

      {/* Quick Actions */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr 1fr', sm: '1fr 1fr 1fr' },
          gap: 2,
          mb: 3,
        }}
      >
        <Card
          sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: '#fff',
          }}
        >
          <CardActionArea onClick={() => router.push('/patient/book')} sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
              <i className="ri-calendar-check-line" style={{ fontSize: 32 }} />
              <Typography variant="body2" fontWeight={600} textAlign="center">
                Reservar Cita
              </Typography>
            </Box>
          </CardActionArea>
        </Card>

        <Card
          sx={{
            background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
            color: '#fff',
          }}
        >
          <CardActionArea onClick={() => router.push('/patient/appointments')} sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
              <i className="ri-list-check-2" style={{ fontSize: 32 }} />
              <Typography variant="body2" fontWeight={600} textAlign="center">
                Mis Citas
              </Typography>
            </Box>
          </CardActionArea>
        </Card>

        <Card
          sx={{
            background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
            color: '#fff',
            gridColumn: { xs: '1 / -1', sm: 'auto' },
          }}
        >
          <CardActionArea onClick={() => router.push('/patient/profile')} sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
              <i className="ri-user-heart-line" style={{ fontSize: 32 }} />
              <Typography variant="body2" fontWeight={600} textAlign="center">
                Mi Perfil
              </Typography>
            </Box>
          </CardActionArea>
        </Card>
      </Box>

      {/* Upcoming Appointments */}
      <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
        Próximas Citas
      </Typography>

      {loading ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {[1, 2].map((i) => (
            <Skeleton key={i} variant="rounded" height={100} />
          ))}
        </Box>
      ) : upcoming.length === 0 ? (
        <Alert severity="info" sx={{ borderRadius: 2 }}>
          No tienes citas próximas.{' '}
          <Typography
            component="span"
            variant="body2"
            sx={{ cursor: 'pointer', textDecoration: 'underline', fontWeight: 600 }}
            onClick={() => router.push('/patient/book')}
          >
            Reserva una ahora
          </Typography>
        </Alert>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {upcoming.map((apt) => {
            const cfg = statusConfig[apt.status] ?? { label: apt.status, color: 'default' as const };
            const schedDate = new Date(apt.schedule.scheduleDate);

            return (
              <Card key={apt.id} variant="outlined" sx={{ borderRadius: 2 }}>
                <CardActionArea
                  onClick={() => router.push('/patient/appointments')}
                  sx={{ p: 0 }}
                >
                  <CardContent sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                    {/* Date box */}
                    <Box
                      sx={{
                        width: 56,
                        height: 56,
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
                      <Typography variant="caption" fontWeight={700} lineHeight={1}>
                        {schedDate.toLocaleDateString('es-PE', { month: 'short', timeZone: 'UTC' }).toUpperCase()}
                      </Typography>
                      <Typography variant="h6" fontWeight={700} lineHeight={1.2}>
                        {schedDate.toLocaleDateString('es-PE', { day: 'numeric', timeZone: 'UTC' })}
                      </Typography>
                    </Box>

                    {/* Info */}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="subtitle2" fontWeight={600} noWrap>
                        {apt.schedule.specialty.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" noWrap>
                        Dr. {apt.schedule.doctor.name} {apt.schedule.doctor.lastName}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                        <Typography variant="caption" color="text.secondary">
                          {apt.startTime} - {apt.endTime}
                        </Typography>
                        <Chip label={cfg.label} color={cfg.color} size="small" />
                      </Box>
                    </Box>
                  </CardContent>
                </CardActionArea>
              </Card>
            );
          })}
        </Box>
      )}
    </Box>
  );
}
