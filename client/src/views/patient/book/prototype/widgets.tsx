'use client';

// PROTOTIPO UI-06 — piezas sueltas que reutilizan las variantes (no son layouts).

import { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Radio from '@mui/material/Radio';
import Typography from '@mui/material/Typography';
import classnames from 'classnames';
import {
  type Clinic,
  type Day,
  type Doctor,
  type Specialty,
  PAYMENT_MINUTES,
  formatDay,
  formatMoney,
} from './fixtures';

/** Tarjeta seleccionable al estilo de los custom inputs de Materio. */
export function OptionCard({
  selected,
  onSelect,
  title,
  meta,
  content,
  icon,
  disabled,
  name,
}: {
  selected: boolean;
  onSelect: () => void;
  title: React.ReactNode;
  meta?: React.ReactNode;
  content?: React.ReactNode;
  icon?: string;
  disabled?: boolean;
  name: string;
}) {
  return (
    <Box
      component='label'
      className={classnames('flex items-start gap-2 p-4 cursor-pointer bs-full', { 'opacity-50': disabled })}
      sx={{
        border: '1px solid',
        borderColor: selected ? 'primary.main' : 'var(--mui-palette-customColors-inputBorder)',
        borderRadius: 'var(--mui-shape-borderRadius)',
        '&:hover': { borderColor: selected ? 'primary.main' : 'action.active' },
      }}
    >
      <Radio checked={selected} onChange={onSelect} name={name} disabled={disabled} size='small' sx={{ mt: -0.5, ml: -0.5 }} />
      <div className='flex flex-col gap-1 is-full'>
        <div className='flex items-start justify-between gap-2'>
          <span className='flex items-center gap-2'>
            {icon && <i className={classnames(icon, 'text-xl')} style={{ color: selected ? 'var(--mui-palette-primary-main)' : undefined }} />}
            <Typography className='font-medium' color='text.primary'>
              {title}
            </Typography>
          </span>
          {meta && (
            <Typography variant='body2' color='text.secondary'>
              {meta}
            </Typography>
          )}
        </div>
        {content && (
          <Typography variant='body2' color='text.secondary'>
            {content}
          </Typography>
        )}
      </div>
    </Box>
  );
}

/** Calendario mensual que solo deja elegir los días con cupos. */
export function MonthCalendar({ days, value, onChange }: { days: Day[]; value: string | null; onChange: (date: string) => void }) {
  const first = days[0]?.date ?? new Date().toISOString().slice(0, 10);
  const [month, setMonth] = useState(() => first.slice(0, 7));
  const [y, m] = month.split('-').map(Number) as [number, number];
  const startWeekday = (new Date(y, m - 1, 1).getDay() + 6) % 7; // lunes primero
  const daysInMonth = new Date(y, m, 0).getDate();
  const byDate = new Map(days.map((d) => [d.date, d]));
  const shift = (delta: number) => {
    const d = new Date(y, m - 1 + delta, 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };
  const cells = [...Array(startWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  const monthHasSlots = days.some((d) => d.date.startsWith(month) && d.slots.some((s) => s.available));

  return (
    <div className='flex flex-col gap-2'>
      <div className='flex items-center justify-between'>
        <IconButton size='small' onClick={() => shift(-1)} aria-label='Mes anterior'>
          <i className='ri-arrow-left-s-line' />
        </IconButton>
        <Typography className='font-medium first-letter:uppercase'>
          {new Intl.DateTimeFormat('es', { month: 'long', year: 'numeric' }).format(new Date(y, m - 1, 1))}
        </Typography>
        <IconButton size='small' onClick={() => shift(1)} aria-label='Mes siguiente'>
          <i className='ri-arrow-right-s-line' />
        </IconButton>
      </div>
      <div className='grid grid-cols-7 gap-1 text-center'>
        {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((d) => (
          <Typography key={d} variant='caption' color='text.secondary'>
            {d}
          </Typography>
        ))}
        {cells.map((day, i) => {
          if (!day) return <span key={`e${i}`} />;
          const iso = `${month}-${String(day).padStart(2, '0')}`;
          const info = byDate.get(iso);
          const enabled = !!info?.slots.some((s) => s.available);
          const selected = value === iso;
          return (
            <Button
              key={iso}
              size='small'
              disabled={!enabled}
              onClick={() => onChange(iso)}
              variant={selected ? 'contained' : 'text'}
              aria-label={`${formatDay(iso)}${enabled ? '' : ', sin cupos'}`}
              sx={{ minWidth: 0, px: 0, fontWeight: enabled ? 700 : 400 }}
            >
              <span className='flex flex-col items-center leading-none'>
                {day}
                {enabled && !selected && <span className='mbs-0.5 is-1 bs-1 rounded-full' style={{ background: 'var(--mui-palette-primary-main)' }} />}
              </span>
            </Button>
          );
        })}
      </div>
      {!monthHasSlots && (
        <Typography variant='body2' color='text.secondary' className='text-center'>
          No hay cupos este mes.
        </Typography>
      )}
    </div>
  );
}

/** Tira de los próximos 14 días con la cantidad de cupos libres. */
export function DayStrip({ days, value, onChange }: { days: Day[]; value: string | null; onChange: (date: string) => void }) {
  return (
    <div className='flex gap-2 overflow-x-auto pbe-2'>
      {days.slice(0, 14).map((d) => {
        const free = d.slots.filter((s) => s.available).length;
        const selected = value === d.date;
        return (
          <Button
            key={d.date}
            onClick={() => onChange(d.date)}
            disabled={free === 0}
            variant={selected ? 'contained' : 'outlined'}
            sx={{ flexDirection: 'column', minWidth: 76, py: 1, lineHeight: 1.2 }}
          >
            <span className='text-xs'>{formatDay(d.date, { weekday: 'short' })}</span>
            <span className='text-lg font-medium'>{formatDay(d.date, { day: 'numeric' })}</span>
            <span className='text-xs'>{free === 0 ? (d.reason === 'holiday' ? 'Feriado' : 'Lleno') : `${free} cupos`}</span>
          </Button>
        );
      })}
    </div>
  );
}

/** Horas del día elegido; las ocupadas se muestran deshabilitadas (o como sobrecupo). */
export function HourGrid({
  day,
  value,
  onChange,
  allowOverbook,
}: {
  day?: Day;
  value: string | null;
  onChange: (time: string, overbook: boolean) => void;
  allowOverbook?: boolean;
}) {
  if (!day) return <Typography color='text.secondary'>Elige un día para ver sus cupos.</Typography>;
  return (
    <div className='flex flex-wrap gap-2'>
      {day.slots.map((s) => {
        const selected = value === s.time;
        if (!s.available && !allowOverbook) {
          return <Chip key={s.time} label={s.time} disabled variant='outlined' />;
        }
        return (
          <Chip
            key={s.time}
            label={s.available ? s.time : `${s.time} · sobrecupo`}
            clickable
            color={selected ? 'primary' : s.available ? 'default' : 'warning'}
            variant={selected ? 'filled' : 'outlined'}
            onClick={() => onChange(s.time, !s.available)}
          />
        );
      })}
    </div>
  );
}

/** Resumen con precio en la moneda de la sede, plazo de pago y aviso de Mercado Pago. */
export function BookingSummary({
  clinic,
  specialty,
  doctor,
  date,
  time,
  online = true,
}: {
  clinic?: Clinic;
  specialty?: Specialty;
  doctor?: Doctor;
  date: string | null;
  time: string | null;
  online?: boolean;
}) {
  const rows: [string, React.ReactNode][] = [
    ['Sede', clinic ? `${clinic.name} (${clinic.city})` : '—'],
    ['Especialidad', specialty?.name ?? '—'],
    ['Médico', doctor?.name ?? '—'],
    ['Fecha', date ? formatDay(date) : '—'],
    ['Cupo', time ? `${time} (hora de ${clinic?.city ?? 'la sede'})` : '—'],
  ];
  const price = clinic && specialty ? specialty.priceByClinic[clinic.id] : undefined;
  return (
    <div className='flex flex-col gap-3'>
      {rows.map(([k, v]) => (
        <div key={k} className='flex justify-between gap-4'>
          <Typography color='text.secondary'>{k}</Typography>
          <Typography color='text.primary' className='text-end font-medium'>
            {v}
          </Typography>
        </div>
      ))}
      <div className='flex justify-between gap-4 pbs-3' style={{ borderTop: '1px solid var(--mui-palette-divider)' }}>
        <Typography className='font-medium'>Total</Typography>
        <Typography variant='h5'>{clinic && price !== undefined ? formatMoney(price, clinic) : '—'}</Typography>
      </div>
      {online && (
        <Typography variant='body2' color='text.secondary'>
          Al confirmar, el cupo queda reservado {PAYMENT_MINUTES} minutos mientras pagas en Mercado Pago. Te
          redirigiremos a su página de pago.
        </Typography>
      )}
    </div>
  );
}

/** Estado actual del prototipo (regla 5 del skill: mostrar el estado en cada cambio). */
export function StatePanel({ state }: { state: unknown }) {
  return (
    <details className='mbs-6 opacity-70'>
      <summary className='cursor-pointer text-sm'>Estado del prototipo</summary>
      <pre className='text-xs overflow-auto'>{JSON.stringify(state, null, 2)}</pre>
    </details>
  );
}
