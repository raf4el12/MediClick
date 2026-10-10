'use client';

import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import { useAppSelector } from '@/redux-store/hooks';
import { selectUser } from '@/redux-store/slices/auth';
import { getTodayInTimezone } from '@/utils/timezone';
import { AppointmentStatus } from '@/views/appointments/types';
import { useAgenda } from '@/views/agenda/hooks/useAgenda';
import { specialtyName } from '@/views/agenda/model/specialtyName';
import AtencionPanel from './components/AtencionPanel';
import JornadaIndicators from './components/JornadaIndicators';
import JornadaList from './components/JornadaList';

const SCOPE = {};

/** Jornada del médico: indicadores y citas de hoy con el espacio de atención al costado (UI-14, variante A). */
export default function JornadaView() {
  const user = useAppSelector(selectUser);
  const timezone = user?.clinicTimezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  const [today] = useState(() => getTodayInTimezone(timezone));
  const [title] = useState(() =>
    new Intl.DateTimeFormat('es-PE', { weekday: 'long', day: 'numeric', month: 'long', timeZone: timezone }).format(new Date()),
  );
  const range = useMemo(() => ({ from: today, to: today }), [today]);
  const { snapshot, isLoading, error } = useAgenda(SCOPE, range, { refetchInterval: 2 * 60_000 });

  const appointments = useMemo(
    () => [...(snapshot?.appointments ?? [])].sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [snapshot],
  );
  const [chosenId, setChosenId] = useState<number | null>(null);
  const panelRef = useRef<HTMLElement>(null);
  const selected =
    appointments.find((a) => a.id === chosenId) ?? (chosenId === null ? appointments.find((a) => a.status === AppointmentStatus.IN_PROGRESS) : undefined);
  const nameOf = (id: number) => (snapshot ? specialtyName(snapshot, id) : '');

  return (
    <div className='flex flex-col gap-6'>
      <div className='flex flex-wrap items-end justify-between gap-3'>
        <div>
          <Typography variant='h4' component='h1'>
            Jornada de hoy
          </Typography>
          <Typography color='text.secondary' className='first-letter:uppercase'>
            {title}
            {user?.clinicName ? ` · ${user.clinicName}` : ''}
          </Typography>
        </div>
        <Button component={Link} href='/doctor/agenda' variant='outlined' endIcon={<i className='ri-calendar-line' aria-hidden />}>
          Ver agenda
        </Button>
      </div>
      <JornadaIndicators indicators={snapshot?.indicators} />
      <div className='grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px] items-start'>
        <JornadaList
          appointments={appointments}
          specialtyName={nameOf}
          loading={isLoading}
          error={!!error}
          selectedId={selected?.id ?? null}
          onSelect={(a) => {
            setChosenId(a.id);
            // En pantallas angostas el panel queda debajo de la lista: llevarlo a la vista.
            const panel = panelRef.current;
            if (panel && panel.getBoundingClientRect().top > window.innerHeight * 0.5) {
              const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
              panel.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
            }
          }}
        />
        <Card ref={panelRef} component='section' aria-label='Espacio de atención' className='lg:sticky lg:top-24 scroll-mt-24'>
          <CardContent>
            {selected ? (
              <AtencionPanel key={selected.id} appointment={selected} specialtyName={nameOf(selected.specialtyId)} timezone={timezone} />
            ) : (
              <Typography color='text.secondary'>Elige una cita de la lista para atenderla.</Typography>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
