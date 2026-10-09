'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Alert from '@mui/material/Alert';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Pagination from '@mui/material/Pagination';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import { appointmentsService } from '@/services/appointments.service';
import { AppointmentStatus, type Appointment, type PatientAppointmentFilters } from '@/views/appointments/types';
import { AppointmentDetail } from './components/AppointmentDetail';
import { AppointmentList } from './components/AppointmentList';
import { appointmentActions } from './functions/appointmentActions';
import { useAppointmentActions } from './hooks/useAppointmentActions';

type TabKey = 'upcoming' | 'all' | 'completed' | 'cancelled';

// Decisión 5 de UI-10: pestañas; Canceladas incluye las inasistencias.
const TABS: { key: TabKey; label: string; filters: PatientAppointmentFilters; empty: string }[] = [
  { key: 'upcoming', label: 'Próximas', filters: { upcoming: true }, empty: 'No tienes citas próximas.' },
  { key: 'all', label: 'Todas', filters: {}, empty: 'Todavía no tienes citas.' },
  { key: 'completed', label: 'Completadas', filters: { status: AppointmentStatus.COMPLETED }, empty: 'No tienes citas completadas.' },
  {
    key: 'cancelled',
    label: 'Canceladas',
    filters: { statuses: [AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW] },
    empty: 'No tienes citas canceladas.',
  },
];

const PAGE_SIZE = 10;

export default function PatientAppointmentsView() {
  const [tab, setTab] = useState<TabKey>('upcoming');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const { run, dialogs, reviewedIds, payingId } = useAppointmentActions();
  const current = TABS.find((t) => t.key === tab)!;

  const list = useQuery({
    queryKey: ['patient', 'appointments', tab, page],
    queryFn: () => appointmentsService.getMyAppointments({ currentPage: page, pageSize: PAGE_SIZE }, current.filters),
  });

  const rows = list.data?.rows ?? [];
  const now = new Date();
  const actionsFor = (a: Appointment) => appointmentActions(a, { now, reviewed: reviewedIds.has(a.id) });
  const selected = rows.find((a) => a.id === selectedId) ?? null;

  return (
    <div className='flex flex-col gap-4'>
      <div>
        <Typography variant='h4' component='h1'>
          Mis citas
        </Typography>
        <Typography color='text.secondary'>Tus citas en todas las sedes, con la hora de cada sede.</Typography>
      </div>
      <Card>
        <Tabs
          value={tab}
          onChange={(_, value: TabKey) => {
            setTab(value);
            setPage(1);
          }}
          variant='scrollable'
          className='pli-4'
          aria-label='Filtrar citas'
        >
          {TABS.map((t) => (
            <Tab key={t.key} value={t.key} label={t.label} />
          ))}
        </Tabs>
        <Divider />
        {list.isLoading ? (
          <CardContent className='flex justify-center'>
            <CircularProgress aria-label='Cargando tus citas' />
          </CardContent>
        ) : list.isError ? (
          <CardContent>
            <Alert severity='error'>No pudimos cargar tus citas.</Alert>
          </CardContent>
        ) : rows.length === 0 ? (
          <CardContent>
            <Typography color='text.secondary'>{current.empty}</Typography>
          </CardContent>
        ) : (
          <AppointmentList rows={rows} actionsFor={actionsFor} onOpen={(a) => setSelectedId(a.id)} onRun={run} />
        )}
        {(list.data?.totalPages ?? 0) > 1 && (
          <CardContent className='flex justify-center'>
            <Pagination count={list.data!.totalPages} page={page} onChange={(_, value) => setPage(value)} />
          </CardContent>
        )}
      </Card>
      <AppointmentDetail
        appointment={selected}
        actions={selected ? actionsFor(selected) : []}
        onClose={() => setSelectedId(null)}
        onRun={run}
        paying={payingId === selected?.id}
      />
      {dialogs}
    </div>
  );
}
