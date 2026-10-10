'use client';

import { useState } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControlLabel from '@mui/material/FormControlLabel';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Skeleton from '@mui/material/Skeleton';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { extractApiError } from '@/utils/extractApiError';
import { getTodayInTimezone } from '@/utils/timezone';
import { notify } from '@/utils/notify';
import { useAgenda } from '@/views/agenda/hooks/useAgenda';
import { specialtyName } from '@/views/agenda/model/specialtyName';
import { useWeekRules } from '../hooks/useAvailability';
import { appointmentsOutsideRules, type RuleSlot, type WeekRules } from '../model/weekRules';
import { AvailabilityType, DAY_LABELS, ORDERED_DAYS, type DayOfWeek } from '../types';
import ImpactList from './ImpactList';

const TYPE_LABEL: Record<AvailabilityType, string> = {
  [AvailabilityType.REGULAR]: 'Regular',
  [AvailabilityType.EXCEPTION]: 'Excepción',
  [AvailabilityType.EXTRA]: 'Extra',
};

const addDays = (date: string, days: number) => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

interface WeeklyRulesEditorProps {
  doctorId: number;
  specialtyId: number;
  timezone: string;
  readOnly: boolean;
}

/** Reglas semanales en formulario (decisión 1 de UI-17), de una especialidad a la vez. */
export default function WeeklyRulesEditor(props: WeeklyRulesEditorProps) {
  const { week, isLoading, error } = useWeekRules(props.doctorId, props.specialtyId);

  if (isLoading) return <Skeleton variant='rounded' height={320} />;
  if (error || !week) return <Alert severity='error'>No se pudieron cargar las reglas. Vuelve a intentarlo.</Alert>;

  return <RulesForm key={`${props.doctorId}-${props.specialtyId}-${JSON.stringify(week)}`} {...props} saved={week} />;
}

function RulesForm({ doctorId, specialtyId, timezone, readOnly, saved }: WeeklyRulesEditorProps & { saved: WeekRules }) {
  const [week, setWeek] = useState(saved);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const { save } = useWeekRules(doctorId, specialtyId);
  const [today] = useState(() => getTodayInTimezone(timezone));
  // Citas próximas (hasta 42 días, el máximo de la agenda de un médico) para avisar cuáles quedan fuera.
  const upcoming = useAgenda({ doctorId }, confirming ? { from: today, to: addDays(today, 41) } : null);

  const setDay = (day: DayOfWeek, slots: RuleSlot[]) => setWeek((w) => ({ ...w, days: { ...w.days, [day]: slots } }));
  const setSlot = (day: DayOfWeek, index: number, patch: Partial<RuleSlot>) =>
    setDay(day, week.days[day].map((s, i) => (i === index ? { ...s, ...patch } : s)));

  const validate = () => {
    if (!week.validity.startDate || !week.validity.endDate) return 'Indica desde y hasta cuándo valen las reglas.';
    if (week.validity.endDate < week.validity.startDate) return 'La vigencia termina antes de empezar.';
    const bad = ORDERED_DAYS.find((d) => week.days[d].some((s) => !s.start || !s.end || s.start >= s.end));
    if (bad) return `Revisa las franjas del ${DAY_LABELS[bad].toLowerCase()}: la hora de fin debe ser posterior a la de inicio.`;
    return null;
  };

  const outside = upcoming.snapshot
    ? appointmentsOutsideRules(upcoming.snapshot.appointments, specialtyId, week, today).map((a) => ({
        ...a,
        specialtyName: specialtyName(upcoming.snapshot!, a.specialtyId),
      }))
    : undefined;

  return (
    <div className='flex flex-col gap-5'>
      {formError && <Alert severity='error'>{formError}</Alert>}
      <div className='grid gap-3 sm:grid-cols-2 max-is-[480px]'>
        <TextField
          id='reglas-desde'
          size='small'
          type='date'
          label='Vigente desde'
          value={week.validity.startDate}
          disabled={readOnly}
          onChange={(e) => setWeek((w) => ({ ...w, validity: { ...w.validity, startDate: e.target.value } }))}
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <TextField
          id='reglas-hasta'
          size='small'
          type='date'
          label='Vigente hasta'
          value={week.validity.endDate}
          disabled={readOnly}
          onChange={(e) => setWeek((w) => ({ ...w, validity: { ...w.validity, endDate: e.target.value } }))}
          slotProps={{ inputLabel: { shrink: true } }}
        />
      </div>
      <ul className='flex flex-col m-0 p-0 list-none'>
        {ORDERED_DAYS.map((day) => {
          const slots = week.days[day];
          const label = DAY_LABELS[day];
          return (
            <li key={day} className='flex flex-col gap-3 plb-3 sm:flex-row sm:items-start' style={{ borderBlockStart: '1px solid var(--mui-palette-divider)' }}>
              <FormControlLabel
                className='is-40 shrink-0'
                label={label}
                control={
                  <Switch
                    checked={slots.length > 0}
                    disabled={readOnly}
                    onChange={(_, on) => setDay(day, on ? [{ start: '08:00', end: '14:00', type: AvailabilityType.REGULAR }] : [])}
                    slotProps={{ input: { role: 'switch' } }}
                  />
                }
              />
              {slots.length === 0 ? (
                <Typography color='text.secondary' className='sm:plb-2'>
                  Sin atención
                </Typography>
              ) : (
                <div className='flex flex-col gap-2 flex-1'>
                  {slots.map((slot, i) => (
                    <div key={i} className='flex flex-wrap items-center gap-2'>
                      <TextField
                        size='small'
                        type='time'
                        label='Desde'
                        value={slot.start}
                        disabled={readOnly}
                        onChange={(e) => setSlot(day, i, { start: e.target.value })}
                        slotProps={{ inputLabel: { shrink: true }, htmlInput: { 'aria-label': `${label}, franja ${i + 1}: desde` } }}
                        className='is-36'
                      />
                      <TextField
                        size='small'
                        type='time'
                        label='Hasta'
                        value={slot.end}
                        disabled={readOnly}
                        onChange={(e) => setSlot(day, i, { end: e.target.value })}
                        slotProps={{ inputLabel: { shrink: true }, htmlInput: { 'aria-label': `${label}, franja ${i + 1}: hasta` } }}
                        className='is-36'
                      />
                      <TextField
                        select
                        size='small'
                        label='Tipo'
                        value={slot.type}
                        disabled={readOnly}
                        onChange={(e) => setSlot(day, i, { type: e.target.value as AvailabilityType })}
                        slotProps={{ select: { inputProps: { 'aria-label': `${label}, franja ${i + 1}: tipo` } } }}
                        className='is-36'
                      >
                        {Object.values(AvailabilityType).map((t) => (
                          <MenuItem key={t} value={t}>
                            {TYPE_LABEL[t]}
                          </MenuItem>
                        ))}
                      </TextField>
                      {!readOnly && (
                        <IconButton aria-label={`Quitar franja ${i + 1} del ${label.toLowerCase()}`} onClick={() => setDay(day, slots.filter((_, j) => j !== i))}>
                          <i className='ri-delete-bin-line' aria-hidden />
                        </IconButton>
                      )}
                    </div>
                  ))}
                  {!readOnly && (
                    <Button
                      size='small'
                      className='self-start'
                      startIcon={<i className='ri-add-line' aria-hidden />}
                      aria-label={`Agregar franja el ${label.toLowerCase()}`}
                      onClick={() => setDay(day, [...slots, { start: '14:00', end: '18:00', type: AvailabilityType.REGULAR }])}
                    >
                      Agregar franja
                    </Button>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {!readOnly && (
        <div className='flex flex-wrap items-center gap-3'>
          <Button
            variant='contained'
            onClick={() => {
              const problem = validate();
              setFormError(problem);
              if (!problem) setConfirming(true);
            }}
          >
            Guardar reglas
          </Button>
          <Typography variant='body2' color='text.secondary'>
            Al guardar se reemplazan las reglas de esta especialidad y se regeneran los cupos libres de toda la vigencia.
          </Typography>
        </div>
      )}
      <Dialog open={confirming} onClose={() => setConfirming(false)} maxWidth='sm' fullWidth aria-labelledby='reglas-confirmar'>
        <DialogTitle id='reglas-confirmar'>Guardar reglas de disponibilidad</DialogTitle>
        <DialogContent className='flex flex-col gap-3'>
          <Typography>Las citas reservadas no se cancelan: si quedan fuera de las nuevas reglas, conservan su cupo.</Typography>
          <ImpactList rows={outside} loading={upcoming.isLoading} cancels={false} empty='Ninguna cita próxima queda fuera de las nuevas reglas.' />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirming(false)}>Volver</Button>
          <Button
            variant='contained'
            disabled={save.isPending}
            onClick={() =>
              save.mutate(week, {
                onSuccess: () => {
                  setConfirming(false);
                  notify('Reglas guardadas');
                },
                onError: (err) => {
                  setConfirming(false);
                  setFormError(extractApiError(err, 'No se pudieron guardar las reglas').message);
                },
              })
            }
          >
            Guardar
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
