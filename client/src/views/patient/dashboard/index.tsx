'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import { useAppSelector } from '@/redux-store/hooks';
import { selectUser } from '@/redux-store/slices/auth';
import { appointmentsService } from '@/services/appointments.service';
import { waitlistService } from '@/services/waitlist.service';
import { formatDay } from '@/views/booking/format';
import { useAppointmentActions } from '@/views/patient/appointments/hooks/useAppointmentActions';
import { NextAppointmentCard } from './components/NextAppointmentCard';
import { PatientStats } from './components/PatientStats';
import { RecentAppointments } from './components/RecentAppointments';

/** Inicio del paciente: tablero (decisión 1 de UI-10). */
export default function PatientDashboardView() {
  const user = useAppSelector(selectUser);
  const { run, dialogs, payingId } = useAppointmentActions();

  const summary = useQuery({ queryKey: ['patient', 'summary'], queryFn: () => appointmentsService.getMySummary() });
  const recent = useQuery({
    queryKey: ['patient', 'appointments', 'recent'],
    queryFn: () => appointmentsService.getMyAppointments({ currentPage: 1, pageSize: 4 }).then((r) => r.rows),
  });
  const offers = useQuery({ queryKey: ['waitlist', 'my-offers'], queryFn: () => waitlistService.getMyOffers() });
  const offer = offers.data?.[0];

  const firstName = user?.name?.split(' ')[0] ?? '';

  return (
    <div className='flex flex-col gap-6'>
      <Card>
        <CardContent className='flex flex-wrap items-center justify-between gap-4'>
          <div>
            <Typography variant='h4' component='h1'>
              Hola, {firstName} 👋
            </Typography>
            <Typography color='text.secondary'>Aquí tienes tus citas en todas tus sedes.</Typography>
          </div>
          <Button component={Link} href='/patient/book' variant='contained' startIcon={<i className='ri-add-line' />}>
            Reservar cita
          </Button>
        </CardContent>
      </Card>

      {offer && (
        <Alert
          severity='info'
          action={
            <Button component={Link} href='/patient/waitlist' size='small'>
              Ver oferta
            </Button>
          }
        >
          Tienes una oferta de cupo para {offer.specialtyName} el {formatDay(offer.scheduleDate)} a las {offer.startTime}.
        </Alert>
      )}

      {summary.isLoading ? (
        <CircularProgress aria-label='Cargando tu resumen' />
      ) : summary.isError || !summary.data ? (
        <Alert severity='error'>No pudimos cargar el resumen de tus citas.</Alert>
      ) : (
        <>
          <PatientStats summary={summary.data} />
          <div className='grid gap-6 lg:grid-cols-[3fr_2fr]'>
            <NextAppointmentCard
              appointment={summary.data.nextAppointment}
              onRun={run}
              paying={payingId === summary.data.nextAppointment?.id}
            />
            <RecentAppointments appointments={recent.data ?? []} />
          </div>
        </>
      )}
      {dialogs}
    </div>
  );
}
