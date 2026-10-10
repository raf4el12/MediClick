'use client';

// PROTOTIPO UI-17 — piezas que reutilizan las variantes.

import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import esLocale from '@fullcalendar/core/locales/es';
import type { CalendarOptions } from '@fullcalendar/core';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import FormControlLabel from '@mui/material/FormControlLabel';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import AppFullCalendar from '@/libs/styles/AppFullCalendar';
import type { AgendaAppointment } from '@/views/agenda/types';
import { DAY_NAMES, PAYMENT_LABEL, dayTitle, doctor, specialtyName, type RestrictionDraft, type Rule } from './fixtures';

const TIME_FORMAT = { hour: '2-digit', minute: '2-digit', hour12: false } as const;

/** FullCalendar con la configuración de la capa de agenda (UTC = hora de la sede) y datos falsos. */
export function ProtoCalendar(props: CalendarOptions) {
  return (
    <AppFullCalendar>
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        timeZone='UTC'
        locale={esLocale}
        buttonText={{ today: 'Hoy', month: 'Mes', week: 'Semana', day: 'Día' }}
        allDayText='Todo el día'
        slotLabelFormat={TIME_FORMAT}
        eventTimeFormat={TIME_FORMAT}
        eventDisplay='block'
        scrollTime='07:00:00'
        snapDuration='00:10:00'
        contentHeight={560}
        {...props}
      />
    </AppFullCalendar>
  );
}

/** Vista previa de impacto: citas activas que caerían dentro, con su estado de pago. */
const PAYMENT_STATE: Record<string, string> = { PAID: 'Pagada', PARTIAL: 'Con seña', PENDING: 'Sin pagar' };

export function ImpactList({ appointments, verb = 'se cancelarían', empty = 'No hay citas dentro de esta restricción.', cancels = true }: { appointments: AgendaAppointment[]; verb?: string; empty?: string; cancels?: boolean }) {
  if (appointments.length === 0) {
    return <Alert severity='success'>{empty}</Alert>;
  }
  const paid = appointments.filter((a) => a.paymentStatus !== 'PENDING').length;
  return (
    <Alert severity='warning' icon={false}>
      <Typography className='font-medium mbe-2'>
        {appointments.length} {appointments.length === 1 ? 'cita' : 'citas'} {verb}
        {cancels && paid > 0 ? `; ${paid} con pago quedan con reembolso pendiente` : ''}.
      </Typography>
      <ul className='flex flex-col gap-2 m-0 p-0 list-none'>
        {appointments.map((a) => (
          <li key={a.id} className='flex flex-wrap items-center gap-2'>
            <Typography variant='body2' className='font-medium'>
              {dayTitle(a.date)} · {a.startTime}
            </Typography>
            <Typography variant='body2'>
              {a.patient.fullName} ({specialtyName(a.specialtyId)})
            </Typography>
            <Chip size='small' variant='outlined' label={(cancels ? PAYMENT_LABEL : PAYMENT_STATE)[a.paymentStatus] ?? a.paymentStatus} />
          </li>
        ))}
      </ul>
    </Alert>
  );
}

/** Formulario de bloqueo de agenda: tipo, fechas, horas y motivo. */
export function BlockForm({ draft, reason, onChange, onReason }: { draft: RestrictionDraft; reason: string; onChange: (d: RestrictionDraft) => void; onReason: (r: string) => void }) {
  return (
    <div className='flex flex-col gap-4'>
      <RadioGroup
        row
        value={draft.type}
        onChange={(_, type) =>
          onChange({ ...draft, type: type as RestrictionDraft['type'], timeFrom: type === 'FULL_DAY' ? null : draft.timeFrom ?? '08:00', timeTo: type === 'FULL_DAY' ? null : draft.timeTo ?? '12:00' })
        }
      >
        <FormControlLabel value='FULL_DAY' control={<Radio />} label='Día completo' />
        <FormControlLabel value='TIME_RANGE' control={<Radio />} label='Por horas' />
      </RadioGroup>
      <div className='grid gap-3 grid-cols-2'>
        <TextField size='small' type='date' label='Desde' value={draft.startDate} onChange={(e) => onChange({ ...draft, startDate: e.target.value })} slotProps={{ inputLabel: { shrink: true } }} />
        <TextField size='small' type='date' label='Hasta' value={draft.endDate} onChange={(e) => onChange({ ...draft, endDate: e.target.value })} slotProps={{ inputLabel: { shrink: true } }} />
        {draft.type === 'TIME_RANGE' && (
          <>
            <TextField size='small' type='time' label='Hora de inicio' value={draft.timeFrom ?? ''} onChange={(e) => onChange({ ...draft, timeFrom: e.target.value })} slotProps={{ inputLabel: { shrink: true } }} />
            <TextField size='small' type='time' label='Hora de fin' value={draft.timeTo ?? ''} onChange={(e) => onChange({ ...draft, timeTo: e.target.value })} slotProps={{ inputLabel: { shrink: true } }} />
          </>
        )}
      </div>
      <TextField size='small' label='Motivo' value={reason} onChange={(e) => onReason(e.target.value)} placeholder='Congreso, vacaciones, capacitación…' />
    </div>
  );
}

/** Reglas semanales en formulario (el configurador actual, reestilizado). */
export function RulesForm({ rules, onChange }: { rules: Rule[]; onChange: (rules: Rule[]) => void }) {
  const update = (id: number, patch: Partial<Rule>) => onChange(rules.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  return (
    <div className='flex flex-col gap-3'>
      {[...rules]
        .sort((a, b) => a.dayIndex - b.dayIndex || a.timeFrom.localeCompare(b.timeFrom))
        .map((r) => (
          <div key={r.id} className='grid gap-2 items-center sm:grid-cols-[140px_180px_140px_140px_130px_auto]'>
            <TextField select size='small' label='Día' value={r.dayIndex} onChange={(e) => update(r.id, { dayIndex: Number(e.target.value) })}>
              {DAY_NAMES.map((d, i) => (
                <MenuItem key={d} value={i}>
                  {d}
                </MenuItem>
              ))}
            </TextField>
            <TextField select size='small' label='Especialidad' value={r.specialtyId} onChange={(e) => update(r.id, { specialtyId: Number(e.target.value) })}>
              {doctor.specialties.map((s) => (
                <MenuItem key={s.id} value={s.id}>
                  {s.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField size='small' type='time' label='Desde' value={r.timeFrom} onChange={(e) => update(r.id, { timeFrom: e.target.value })} slotProps={{ inputLabel: { shrink: true } }} />
            <TextField size='small' type='time' label='Hasta' value={r.timeTo} onChange={(e) => update(r.id, { timeTo: e.target.value })} slotProps={{ inputLabel: { shrink: true } }} />
            <TextField select size='small' label='Tipo' value={r.type} onChange={(e) => update(r.id, { type: e.target.value as Rule['type'] })}>
              <MenuItem value='REGULAR'>Regular</MenuItem>
              <MenuItem value='EXCEPTION'>Excepción</MenuItem>
              <MenuItem value='EXTRA'>Extra</MenuItem>
            </TextField>
            <IconButton aria-label={`Quitar franja del ${DAY_NAMES[r.dayIndex]}`} onClick={() => onChange(rules.filter((x) => x.id !== r.id))}>
              <i className='ri-delete-bin-line' />
            </IconButton>
          </div>
        ))}
      <Button
        variant='outlined'
        className='self-start'
        startIcon={<i className='ri-add-line' />}
        onClick={() => onChange([...rules, { ...rules[0]!, id: Date.now(), dayIndex: 5, timeFrom: '08:00', timeTo: '12:00' }])}
      >
        Agregar franja
      </Button>
    </div>
  );
}

export function StatePanel({ state }: { state: unknown }) {
  return (
    <details className='opacity-70'>
      <summary className='cursor-pointer text-sm'>Estado del prototipo</summary>
      <pre className='text-xs overflow-auto'>{JSON.stringify(state, null, 2)}</pre>
    </details>
  );
}
