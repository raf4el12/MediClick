'use client';

// PROTOTIPO UI-14 — piezas sueltas que reutilizan las variantes (no son layouts).

import { useState } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import CustomAvatar from '@core/components/mui/Avatar';
import {
  STATUS_COLOR,
  STATUS_LABEL,
  blocks,
  cupos,
  holidays,
  indicatorsFor,
  specialtyName,
  type AgendaAppointment,
} from './fixtures';

export function StatusChip({ a }: { a: AgendaAppointment }) {
  return (
    <span className='flex flex-wrap gap-1'>
      <Chip size='small' variant='tonal' color={STATUS_COLOR[a.status]} label={STATUS_LABEL[a.status]} />
      {a.isAtRisk && <Chip size='small' variant='tonal' color='error' label='En riesgo' />}
      {a.paymentStatus !== 'PAID' && !['CANCELLED', 'NO_SHOW'].includes(a.status) && (
        <Chip size='small' variant='outlined' label={a.paymentStatus === 'PARTIAL' ? 'Seña' : 'Pago pendiente'} />
      )}
      {a.isOverbook && <Chip size='small' variant='outlined' label='Sobrecupo' />}
    </span>
  );
}

/** Indicadores propuestos: ocupación, por estado, en riesgo, con pago pendiente. */
export function Indicators({ date, compact }: { date: string; compact?: boolean }) {
  const ind = indicatorsFor(date);
  const items = [
    { icon: 'ri-pie-chart-line', color: 'primary' as const, title: 'Ocupación', value: `${Math.round(ind.occupancyRate * 100)} %`, sub: `${ind.bookedCupos} de ${ind.totalCupos} cupos` },
    { icon: 'ri-user-follow-line', color: 'success' as const, title: 'Atendidas', value: String(ind.byStatus.COMPLETED ?? 0), sub: `${ind.byStatus.CONFIRMED ?? 0} confirmadas por atender` },
    { icon: 'ri-alarm-warning-line', color: 'error' as const, title: 'En riesgo', value: String(ind.atRisk), sub: 'Pueden no presentarse' },
    { icon: 'ri-bank-card-line', color: 'warning' as const, title: 'Pago pendiente', value: String(ind.pendingPayment), sub: 'Pendientes o con seña' },
  ];
  return (
    <div className={compact ? 'grid gap-3 grid-cols-2' : 'grid gap-4 sm:grid-cols-2 xl:grid-cols-4'}>
      {items.map((i) => (
        <Card key={i.title}>
          <CardContent className='flex justify-between gap-2'>
            <div>
              <Typography color='text.primary'>{i.title}</Typography>
              <Typography variant={compact ? 'h5' : 'h4'}>{i.value}</Typography>
              <Typography variant='body2' color='text.secondary'>
                {i.sub}
              </Typography>
            </div>
            <CustomAvatar color={i.color} skin='light' variant='rounded' size={40}>
              <i className={`${i.icon} text-2xl`} />
            </CustomAvatar>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/** Espacio de atención: resumen del paciente, notas, receta e historial (simulados). */
export function AttentionPanel({ a, onClose }: { a: AgendaAppointment; onClose?: () => void }) {
  const [tab, setTab] = useState('nota');
  return (
    <div className='flex flex-col gap-4'>
      <div className='flex items-start justify-between gap-2'>
        <div className='flex items-center gap-3'>
          <CustomAvatar skin='light' color='primary' size={44}>
            {a.patient.fullName.charAt(0)}
          </CustomAvatar>
          <div>
            <Typography variant='h6'>{a.patient.fullName}</Typography>
            <Typography variant='body2' color='text.secondary'>
              {a.patient.age} años · {a.patient.document}
            </Typography>
          </div>
        </div>
        {onClose && (
          <Button size='small' onClick={onClose}>
            Cerrar
          </Button>
        )}
      </div>
      <StatusChip a={a} />
      <Typography variant='body2'>
        {a.startTime}–{a.endTime} · {specialtyName(a.specialtyId)}
        {a.reason ? ` · Motivo: ${a.reason}` : ''}
      </Typography>
      {a.patient.allergies && <Alert severity='warning'>Alergia: {a.patient.allergies}</Alert>}
      <div className='flex flex-wrap gap-2'>
        {a.status === 'CONFIRMED' && <Button variant='contained' size='small'>Marcar llegada</Button>}
        {a.status === 'CONFIRMED' && <Button variant='outlined' size='small'>Inasistencia</Button>}
        {a.status === 'IN_PROGRESS' && <Button variant='contained' size='small'>Completar atención</Button>}
      </div>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} variant='scrollable'>
        <Tab value='nota' label='Nota clínica' />
        <Tab value='receta' label='Receta' />
        <Tab value='historia' label='Historia' />
      </Tabs>
      {tab === 'nota' && <TextField multiline minRows={4} label='Evolución y diagnóstico' placeholder='Escribe la nota de la consulta' />}
      {tab === 'receta' && (
        <div className='flex flex-col gap-2'>
          <TextField size='small' label='Medicamento' placeholder='Amoxicilina 500 mg' />
          <TextField size='small' label='Indicaciones' placeholder='1 cápsula cada 8 horas por 7 días' />
          <Button size='small' className='self-start'>
            Agregar medicamento
          </Button>
        </div>
      )}
      {tab === 'historia' && (
        <Typography variant='body2' color='text.secondary'>
          {a.patient.lastVisit ? `Última consulta: ${a.patient.lastVisit}. Hipertensión controlada; sin cambios de medicación.` : 'Primera consulta en la sede.'}
        </Typography>
      )}
    </div>
  );
}

const HOUR_START = 7;
const HOUR_END = 14;
const PX_PER_MIN = 1.4;
const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
const top = (t: string) => (toMin(t) - HOUR_START * 60) * PX_PER_MIN;

/** Grilla del día (sustituto de `timeGridDay` de FullCalendar para el prototipo). */
export function DayGrid({
  date,
  appointments,
  showFreeCupos,
  selectedId,
  onSelect,
}: {
  date: string;
  appointments: AgendaAppointment[];
  showFreeCupos: boolean;
  selectedId: number | null;
  onSelect: (a: AgendaAppointment) => void;
}) {
  const holiday = holidays.find((h) => h.date === date);
  const dayBlocks = blocks.filter((b) => b.startDate <= date && b.endDate >= date && b.type === 'TIME_RANGE');
  const visible = appointments.filter((a) => a.date === date && a.status !== 'CANCELLED');
  const free = showFreeCupos ? cupos.filter((c) => c.date === date && c.available) : [];

  if (holiday) {
    return <Alert severity='info'>Feriado de la sede: {holiday.name}. No hay agenda.</Alert>;
  }

  return (
    <div className='relative' style={{ height: (HOUR_END - HOUR_START) * 60 * PX_PER_MIN }}>
      {Array.from({ length: HOUR_END - HOUR_START + 1 }, (_, i) => (
        <div key={i} className='absolute inset-x-0 flex gap-2' style={{ top: i * 60 * PX_PER_MIN }}>
          <Typography variant='caption' color='text.secondary' className='is-12 -translate-y-2'>
            {String(HOUR_START + i).padStart(2, '0')}:00
          </Typography>
          <div className='flex-1' style={{ borderTop: '1px solid var(--mui-palette-divider)' }} />
        </div>
      ))}
      {dayBlocks.map((b) => (
        <div
          key={b.id}
          className='absolute rounded flex items-center justify-center'
          style={{
            top: top(b.timeFrom!),
            height: (toMin(b.timeTo!) - toMin(b.timeFrom!)) * PX_PER_MIN,
            insetInlineStart: 56,
            insetInlineEnd: 0,
            background: 'repeating-linear-gradient(45deg, var(--mui-palette-action-hover), var(--mui-palette-action-hover) 6px, transparent 6px, transparent 12px)',
          }}
        >
          <Typography variant='body2' color='text.secondary'>
            Bloqueo: {b.reason}
          </Typography>
        </div>
      ))}
      {free.map((c) => (
        <div
          key={`${c.scheduleId}-${c.startTime}`}
          className='absolute rounded px-2 flex items-center'
          style={{
            top: top(c.startTime) + 1,
            height: (toMin(c.endTime) - toMin(c.startTime)) * PX_PER_MIN - 2,
            insetInlineStart: 56,
            insetInlineEnd: '50%',
            border: '1px dashed var(--mui-palette-divider)',
          }}
        >
          <Typography variant='caption' color='text.secondary'>
            {c.startTime} libre
          </Typography>
        </div>
      ))}
      {visible.map((a) => {
        const overbook = a.isOverbook;
        return (
          <button
            key={a.id}
            type='button'
            onClick={() => onSelect(a)}
            aria-pressed={selectedId === a.id}
            className='absolute rounded px-2 text-start cursor-pointer overflow-hidden'
            style={{
              top: top(a.startTime) + 1,
              height: (toMin(a.endTime) - toMin(a.startTime)) * PX_PER_MIN - 2,
              insetInlineStart: overbook ? 'calc(50% + 28px)' : 56,
              insetInlineEnd: overbook ? 0 : '50%',
              border: selectedId === a.id ? '2px solid var(--mui-palette-primary-main)' : '1px solid var(--mui-palette-divider)',
              background: `var(--mui-palette-${STATUS_COLOR[a.status]}-lightOpacity)`,
              font: 'inherit',
              color: 'inherit',
            }}
          >
            <Typography variant='caption' className='font-medium'>
              {a.startTime} {a.patient.fullName}
            </Typography>
          </button>
        );
      })}
    </div>
  );
}

export function StatePanel({ state }: { state: unknown }) {
  return (
    <details className='mbs-6 opacity-70'>
      <summary className='cursor-pointer text-sm'>Estado del prototipo</summary>
      <pre className='text-xs overflow-auto'>{JSON.stringify(state, null, 2)}</pre>
    </details>
  );
}
