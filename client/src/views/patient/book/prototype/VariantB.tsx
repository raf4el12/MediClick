'use client';

// PROTOTIPO UI-06 — Variante B: página única con secciones progresivas.
// Especialidad primero y la sede como filtro · opción "primer cupo con cualquier médico" ·
// tira de 14 días + grilla de horas · resumen fijo a la derecha (abajo en celular) ·
// sin cupos ofrece médicos alternativos con su próximo cupo.

import { useState } from 'react';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import {
  clinicById,
  clinics,
  daysFor,
  doctorById,
  doctors,
  firstAvailable,
  formatDay,
  formatMoney,
  specialties,
  specialtyById,
} from './fixtures';
import { BookingSummary, DayStrip, HourGrid, OptionCard, StatePanel } from './widgets';

export const variantBName = 'Página única progresiva';

const ANY = -1;

function Section({ n, title, locked, children }: { n: number; title: string; locked: boolean; children: React.ReactNode }) {
  return (
    <Card className={locked ? 'opacity-50 pointer-events-none' : undefined} aria-disabled={locked}>
      <CardContent className='flex flex-col gap-4'>
        <div className='flex items-center gap-3'>
          <Chip label={n} size='small' color={locked ? 'default' : 'primary'} />
          <Typography variant='h6'>{title}</Typography>
        </div>
        {!locked && children}
      </CardContent>
    </Card>
  );
}

export function VariantB() {
  const [specialtyId, setSpecialtyId] = useState<number | null>(null);
  const [clinicFilter, setClinicFilter] = useState<number | 'all'>('all');
  const [doctorChoice, setDoctorChoice] = useState<number | null>(null);
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);

  const candidates = doctors.filter(
    (d) => specialtyId && d.specialtyIds.includes(specialtyId) && (clinicFilter === 'all' || d.clinicId === clinicFilter),
  );

  // "Cualquier médico" se resuelve al médico con el cupo más próximo.
  const anyDoctor = candidates
    .map((d) => ({ d, next: firstAvailable(d.id, specialtyId!) }))
    .filter((x) => x.next)
    .sort((a, b) => `${a.next!.date}${a.next!.time}`.localeCompare(`${b.next!.date}${b.next!.time}`))[0];
  const doctorId = doctorChoice === ANY ? (anyDoctor?.d.id ?? null) : doctorChoice;
  const doctor = doctorById(doctorId);
  const clinic = clinicById(doctor?.clinicId ?? (clinicFilter === 'all' ? null : clinicFilter));
  const specialty = specialtyById(specialtyId);
  const days = doctorId && specialtyId ? daysFor(doctorId, specialtyId) : [];
  const hasDays = days.some((d) => d.slots.some((s) => s.available));

  const alternatives = candidates
    .filter((d) => d.id !== doctorId)
    .map((d) => ({ d, next: firstAvailable(d.id, specialtyId!) }))
    .filter((x) => x.next);

  const resetFromDoctor = () => {
    setDate(null);
    setTime(null);
  };

  const ready = !!(doctorId && date && time);

  return (
    <>
      <div className='grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] max-lg:pbe-28'>
        <div className='flex flex-col gap-4 min-is-0'>
          <Section n={1} title='¿Qué especialidad necesitas?' locked={false}>
            <div className='flex flex-wrap gap-2'>
              {specialties.map((s) => (
                <Chip
                  key={s.id}
                  icon={<i className={s.icon} />}
                  label={s.name}
                  clickable
                  color={specialtyId === s.id ? 'primary' : 'default'}
                  variant={specialtyId === s.id ? 'filled' : 'outlined'}
                  onClick={() => {
                    setSpecialtyId(s.id);
                    setDoctorChoice(null);
                    resetFromDoctor();
                  }}
                />
              ))}
            </div>
          </Section>

          <Section n={2} title='Médico' locked={!specialtyId}>
            <div className='flex flex-wrap items-center gap-2'>
              <Typography variant='body2' color='text.secondary'>
                Sede:
              </Typography>
              <ToggleButtonGroup
                size='small'
                exclusive
                value={clinicFilter}
                onChange={(_, v) => {
                  if (v === null) return;
                  setClinicFilter(v);
                  setDoctorChoice(null);
                  resetFromDoctor();
                }}
              >
                <ToggleButton value='all'>Todas</ToggleButton>
                {clinics.map((c) => (
                  <ToggleButton key={c.id} value={c.id}>
                    {c.city}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
            </div>
            <div className='grid gap-3 sm:grid-cols-2'>
              <OptionCard
                name='doctorB'
                selected={doctorChoice === ANY}
                onSelect={() => {
                  setDoctorChoice(ANY);
                  resetFromDoctor();
                }}
                icon='ri-flashlight-line'
                title='Primer cupo disponible'
                content={
                  anyDoctor
                    ? `${anyDoctor.d.name} · ${formatDay(anyDoctor.next!.date, { weekday: 'short', day: 'numeric', month: 'short' })} ${anyDoctor.next!.time}`
                    : 'Sin cupos con estos filtros'
                }
                disabled={!anyDoctor}
              />
              {candidates.map((d) => {
                const next = firstAvailable(d.id, specialtyId!);
                const c = clinicById(d.clinicId)!;
                return (
                  <OptionCard
                    key={d.id}
                    name='doctorB'
                    selected={doctorChoice === d.id}
                    onSelect={() => {
                      setDoctorChoice(d.id);
                      resetFromDoctor();
                    }}
                    icon='ri-user-heart-line'
                    title={d.name}
                    meta={`★ ${d.rating}`}
                    content={`${c.city} · ${next ? `próximo cupo ${formatDay(next.date, { weekday: 'short', day: 'numeric' })} ${next.time}` : 'sin cupos en 30 días'}`}
                  />
                );
              })}
            </div>
          </Section>

          <Section n={3} title='Día y hora' locked={!doctorId}>
            {hasDays ? (
              <>
                <DayStrip
                  days={days}
                  value={date}
                  onChange={(d) => {
                    setDate(d);
                    setTime(null);
                  }}
                />
                <HourGrid day={days.find((d) => d.date === date)} value={time} onChange={(t) => setTime(t)} />
              </>
            ) : (
              <div className='flex flex-col gap-3'>
                <Typography>{doctor?.name} no tiene cupos en los próximos 30 días. Estos médicos sí:</Typography>
                {alternatives.map(({ d, next }) => (
                  <Button
                    key={d.id}
                    variant='outlined'
                    className='justify-between'
                    onClick={() => {
                      setDoctorChoice(d.id);
                      resetFromDoctor();
                    }}
                  >
                    <span>{d.name}</span>
                    <span>
                      {formatDay(next!.date, { weekday: 'short', day: 'numeric', month: 'short' })} · {next!.time}
                    </span>
                  </Button>
                ))}
              </div>
            )}
          </Section>
        </div>

        <div className='max-lg:hidden'>
          <Card className='sticky' style={{ top: 96 }}>
            <CardContent className='flex flex-col gap-4'>
              <Typography variant='h6'>Tu reserva</Typography>
              <BookingSummary clinic={clinic} specialty={specialty} doctor={doctor} date={date} time={time} />
              <Button variant='contained' color='success' disabled={!ready}>
                Confirmar y pagar
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Celular: resumen compacto fijo sobre la barra inferior. */}
      <div
        className='lg:hidden fixed left-0 right-0 z-[1100] flex items-center justify-between gap-3 p-4 bg-backgroundPaper shadow-lg'
        style={{ bottom: 64 }}
      >
        <div>
          <Typography variant='body2' color='text.secondary'>
            {date && time ? `${formatDay(date, { weekday: 'short', day: 'numeric', month: 'short' })} · ${time}` : 'Elige día y hora'}
          </Typography>
          <Typography className='font-medium'>
            {clinic && specialty ? formatMoney(specialty.priceByClinic[clinic.id]!, clinic) : '—'}
          </Typography>
        </div>
        <Button variant='contained' color='success' disabled={!ready}>
          Confirmar
        </Button>
      </div>
      <StatePanel state={{ variant: 'B', specialtyId, clinicFilter, doctorChoice, resolvedDoctorId: doctorId, date, time }} />
    </>
  );
}
