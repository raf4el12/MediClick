'use client';

// PROTOTIPO UI-14 — Jornada del médico en tres variantes.
//   A — Panel del día (lista + indicadores) con el espacio de atención como panel lateral fijo;
//       la agenda semanal vive en otra ruta y no muestra cupos libres.
//   B — Agenda del día como protagonista (con cupos libres opcionales); la cita se atiende en un
//       drawer al estilo AddEventSidebar de Materio.
//   C — Pestañas Hoy | Semana | Mes; la cita se atiende a pantalla completa con el patrón
//       user/view de Materio (paciente a la izquierda, pestañas de atención a la derecha).

import { useState } from 'react';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Chip from '@mui/material/Chip';
import Drawer from '@mui/material/Drawer';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import CustomAvatar from '@core/components/mui/Avatar';
import { DAYS, TODAY, appointments, dayTitle, doctor, holidays, specialtyName, type AgendaAppointment } from './fixtures';
import { AttentionPanel, DayGrid, Indicators, StatePanel, StatusChip } from './widgets';

const todays = appointments.filter((a) => a.date === TODAY).sort((x, y) => x.startTime.localeCompare(y.startTime));
const inProgress = todays.find((a) => a.status === 'IN_PROGRESS') ?? todays[0]!;

export function VariantA() {
  const [selected, setSelected] = useState<AgendaAppointment>(inProgress);
  return (
    <div className='flex flex-col gap-6'>
      <div className='flex flex-wrap items-end justify-between gap-2'>
        <div>
          <Typography variant='h4' component='h1'>
            Jornada de hoy
          </Typography>
          <Typography color='text.secondary'>
            {dayTitle(TODAY)} · {doctor.specialties.map((s) => s.name).join(' y ')}
          </Typography>
        </div>
        <Button variant='outlined' endIcon={<i className='ri-arrow-right-line' />}>
          Ver agenda semanal
        </Button>
      </div>
      <Indicators date={TODAY} />
      <div className='grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]'>
        <Card>
          <CardHeader title='Citas del día' />
          <ul className='m-0 p-0 list-none'>
            {todays.map((a) => (
              <li key={a.id} style={{ borderTop: '1px solid var(--mui-palette-divider)' }}>
                <button
                  type='button'
                  onClick={() => setSelected(a)}
                  aria-pressed={selected.id === a.id}
                  className='flex flex-wrap items-center gap-3 is-full p-4 text-start bg-transparent border-0 cursor-pointer'
                  style={{ font: 'inherit', color: 'inherit', background: selected.id === a.id ? 'var(--mui-palette-action-selected)' : undefined }}
                >
                  <Typography className='font-medium is-14'>{a.startTime}</Typography>
                  <span className='flex-1 min-is-0'>
                    <Typography color='text.primary'>{a.patient.fullName}</Typography>
                    <Typography variant='body2' color='text.secondary'>
                      {specialtyName(a.specialtyId)}
                      {a.reason ? ` · ${a.reason}` : ''}
                    </Typography>
                  </span>
                  <StatusChip a={a} />
                </button>
              </li>
            ))}
          </ul>
        </Card>
        <Card className='lg:sticky self-start' style={{ top: 88 }}>
          <CardHeader title='Espacio de atención' />
          <CardContent>
            <AttentionPanel a={selected} />
          </CardContent>
        </Card>
      </div>
      <StatePanel state={{ variant: 'A', selected: selected.id, ruta: '/doctor + /doctor/agenda', cuposLibres: false }} />
    </div>
  );
}

export function VariantB() {
  const [date, setDate] = useState(TODAY);
  const [showFree, setShowFree] = useState(true);
  const [view, setView] = useState<'day' | 'week'>('day');
  const [selected, setSelected] = useState<AgendaAppointment | null>(null);

  return (
    <div className='flex flex-col gap-4'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div>
          <Typography variant='h4' component='h1'>
            Mi agenda
          </Typography>
          <Typography color='text.secondary'>{view === 'day' ? dayTitle(date) : 'Próximos 3 días'} · hora de la sede</Typography>
        </div>
        <div className='flex flex-wrap items-center gap-3'>
          <ToggleButtonGroup size='small' exclusive value={view} onChange={(_, v) => v && setView(v)}>
            <ToggleButton value='day'>Día</ToggleButton>
            <ToggleButton value='week'>Semana</ToggleButton>
          </ToggleButtonGroup>
          <FormControlLabel control={<Switch checked={showFree} onChange={(_, v) => setShowFree(v)} />} label='Mostrar cupos libres' />
        </div>
      </div>
      {view === 'day' && (
        <div className='flex flex-wrap gap-2'>
          {DAYS.map((d, i) => (
            <Chip key={d} label={i === 0 ? 'Hoy' : dayTitle(d)} color={d === date ? 'primary' : 'default'} onClick={() => setDate(d)} />
          ))}
        </div>
      )}
      <div className='grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]'>
        <Card>
          <CardContent>
            {view === 'day' ? (
              <DayGrid date={date} appointments={appointments} showFreeCupos={showFree} selectedId={selected?.id ?? null} onSelect={setSelected} />
            ) : (
              <div className='grid gap-4 md:grid-cols-3'>
                {DAYS.map((d) => (
                  <div key={d} className='min-is-0'>
                    <Typography className='font-medium mbe-2'>{dayTitle(d)}</Typography>
                    <DayGrid date={d} appointments={appointments} showFreeCupos={showFree} selectedId={selected?.id ?? null} onSelect={setSelected} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <div className='flex flex-col gap-4'>
          <Indicators date={view === 'day' ? date : TODAY} compact />
          <Typography variant='body2' color='text.secondary'>
            Arrastra una cita pendiente o confirmada a otro cupo libre para reagendarla (UI-16).
          </Typography>
        </div>
      </div>
      <Drawer anchor='right' open={!!selected} onClose={() => setSelected(null)}>
        <div className='p-6 is-[440px] max-is-[100vw]'>{selected && <AttentionPanel a={selected} onClose={() => setSelected(null)} />}</div>
      </Drawer>
      <StatePanel state={{ variant: 'B', date, view, showFree, selected: selected?.id ?? null, ruta: '/doctor (una sola)' }} />
    </div>
  );
}

export function VariantC() {
  const [tab, setTab] = useState<'today' | 'week' | 'month'>('today');
  const [selected, setSelected] = useState<AgendaAppointment | null>(null);

  if (selected) {
    // Patrón user/view de Materio: paciente a la izquierda, atención a la derecha, a pantalla completa.
    return (
      <div className='flex flex-col gap-4'>
        <Button onClick={() => setSelected(null)} startIcon={<i className='ri-arrow-left-line' />} className='self-start'>
          Volver a la jornada
        </Button>
        <div className='grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]'>
          <Card className='self-start'>
            <CardContent className='flex flex-col items-center gap-3 text-center'>
              <CustomAvatar skin='light' color='primary' size={88} variant='rounded'>
                <span className='text-3xl'>{selected.patient.fullName.charAt(0)}</span>
              </CustomAvatar>
              <Typography variant='h5'>{selected.patient.fullName}</Typography>
              <StatusChip a={selected} />
              <div className='is-full text-start flex flex-col gap-1 pbs-3' style={{ borderTop: '1px solid var(--mui-palette-divider)' }}>
                <Typography variant='body2'>Edad: {selected.patient.age} años</Typography>
                <Typography variant='body2'>{selected.patient.document}</Typography>
                <Typography variant='body2'>Alergias: {selected.patient.allergies ?? 'Ninguna registrada'}</Typography>
                <Typography variant='body2'>Última consulta: {selected.patient.lastVisit ?? 'Primera vez'}</Typography>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <AttentionPanel a={selected} />
            </CardContent>
          </Card>
        </div>
        <StatePanel state={{ variant: 'C', tab, selected: selected.id, atención: 'pantalla completa' }} />
      </div>
    );
  }

  return (
    <div className='flex flex-col gap-4'>
      <Typography variant='h4' component='h1'>
        Mi jornada
      </Typography>
      <Card>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} className='pli-4'>
          <Tab value='today' label='Hoy' />
          <Tab value='week' label='Semana' />
          <Tab value='month' label='Mes' />
        </Tabs>
        <CardContent>
          {tab === 'today' && (
            <div className='flex flex-col gap-4'>
              <Indicators date={TODAY} />
              <div className='grid gap-3 md:grid-cols-2'>
                {todays.map((a) => (
                  <Card key={a.id} variant='outlined'>
                    <CardContent className='flex items-start justify-between gap-3'>
                      <div className='flex flex-col gap-1'>
                        <Typography className='font-medium'>
                          {a.startTime} · {a.patient.fullName}
                        </Typography>
                        <Typography variant='body2' color='text.secondary'>
                          {specialtyName(a.specialtyId)}
                        </Typography>
                        <StatusChip a={a} />
                      </div>
                      <Button size='small' variant={a.status === 'IN_PROGRESS' ? 'contained' : 'outlined'} onClick={() => setSelected(a)}>
                        Atender
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
          {tab === 'week' && (
            <div className='grid gap-4 md:grid-cols-3'>
              {DAYS.map((d) => (
                <div key={d} className='flex flex-col gap-2'>
                  <Typography className='font-medium'>{dayTitle(d)}</Typography>
                  {holidays.some((h) => h.date === d) && <Chip size='small' label='Feriado de la sede' />}
                  {appointments
                    .filter((a) => a.date === d && a.status !== 'CANCELLED')
                    .map((a) => (
                      <Button key={a.id} variant='outlined' size='small' className='justify-between' onClick={() => setSelected(a)}>
                        <span>{a.startTime}</span>
                        <span>{a.patient.fullName}</span>
                      </Button>
                    ))}
                </div>
              ))}
            </div>
          )}
          {tab === 'month' && (
            <div className='grid grid-cols-7 gap-2'>
              {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((d) => (
                <Typography key={d} variant='caption' color='text.secondary' className='text-center'>
                  {d}
                </Typography>
              ))}
              {Array.from({ length: 28 }, (_, i) => {
                const d = new Date();
                d.setDate(d.getDate() - d.getDay() + 1 + i);
                const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                const count = appointments.filter((a) => a.date === iso && a.status !== 'CANCELLED').length;
                return (
                  <div key={iso} className='rounded p-2 min-bs-[64px]' style={{ border: '1px solid var(--mui-palette-divider)' }}>
                    <Typography variant='body2'>{d.getDate()}</Typography>
                    {count > 0 && <Chip size='small' color='primary' variant='tonal' label={`${count} citas`} />}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
      <StatePanel state={{ variant: 'C', tab, selected: null, ruta: '/doctor (una sola, con pestañas)' }} />
    </div>
  );
}
