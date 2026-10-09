'use client';

// PROTOTIPO UI-06 — Variante C: wizard vertical (create-app de Materio).
// Especialidad → médico (la sede sale del médico) → cupo → resumen · cupos como agenda de los
// próximos días · "Atrás" limpia la elección del paso que dejas (conducta actual) ·
// sin cupos ofrece lista de espera y médicos alternativos.

import { useState } from 'react';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import LinearProgress from '@mui/material/LinearProgress';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import classnames from 'classnames';
import {
  clinicById,
  daysFor,
  doctorById,
  doctors,
  firstAvailable,
  formatDay,
  formatMoney,
  specialties,
  specialtyById,
} from './fixtures';
import { BookingSummary, StatePanel } from './widgets';

export const variantCName = 'Wizard vertical';

const STEPS = [
  { title: 'Especialidad', subtitle: 'Qué necesitas', icon: 'ri-stethoscope-line' },
  { title: 'Médico', subtitle: 'Con quién y dónde', icon: 'ri-user-heart-line' },
  { title: 'Cupo', subtitle: 'Día y hora', icon: 'ri-calendar-event-line' },
  { title: 'Confirmación', subtitle: 'Revisa y paga', icon: 'ri-checkbox-circle-line' },
];

export function VariantC() {
  const [step, setStep] = useState(0);
  const [specialtyId, setSpecialtyId] = useState<number | null>(null);
  const [doctorId, setDoctorId] = useState<number | null>(null);
  const [slot, setSlot] = useState<{ date: string; time: string } | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [joined, setJoined] = useState(false);

  const specialty = specialtyById(specialtyId);
  const doctor = doctorById(doctorId);
  const clinic = clinicById(doctor?.clinicId);
  const days = doctorId && specialtyId ? daysFor(doctorId, specialtyId).filter((d) => d.slots.some((s) => s.available)) : [];

  const back = () => {
    // Conducta actual de patient/book: al volver se pierde lo elegido en el paso que se deja.
    if (step === 1) setDoctorId(null);
    if (step === 2) setSlot(null);
    setStep((s) => s - 1);
  };
  const complete = [!!specialtyId, !!doctorId, !!slot, true];

  const alternatives = doctors
    .filter((d) => specialtyId && d.specialtyIds.includes(specialtyId) && d.id !== doctorId)
    .map((d) => ({ d, next: firstAvailable(d.id, specialtyId!) }))
    .filter((x) => x.next);

  return (
    <>
      <Card className='flex max-md:flex-col'>
        {/* Pasos: columna en escritorio, barra de progreso en celular */}
        <div className='max-md:hidden flex flex-col gap-6 p-6 min-is-[240px]' style={{ borderInlineEnd: '1px solid var(--mui-palette-divider)' }}>
          {STEPS.map((s, i) => (
            <div key={s.title} className={classnames('flex items-center gap-3', { 'opacity-60': i > step })}>
              <Avatar variant='rounded' sx={{ bgcolor: i <= step ? 'primary.main' : 'action.selected', color: i <= step ? 'primary.contrastText' : 'text.primary' }}>
                <i className={s.icon} />
              </Avatar>
              <div>
                <Typography className='font-medium' color='text.primary'>
                  {s.title}
                </Typography>
                <Typography variant='body2' color='text.secondary'>
                  {s.subtitle}
                </Typography>
              </div>
            </div>
          ))}
        </div>
        <div className='md:hidden p-4 flex flex-col gap-2'>
          <Typography variant='body2' color='text.secondary'>
            Paso {step + 1} de {STEPS.length} · {STEPS[step]!.title}
          </Typography>
          <LinearProgress variant='determinate' value={((step + 1) / STEPS.length) * 100} />
        </div>

        <div className='flex flex-col gap-5 p-6 flex-1 min-is-0'>
          {step === 0 && (
            <div className='flex flex-col gap-2'>
              {specialties.map((s) => (
                <Button
                  key={s.id}
                  variant={specialtyId === s.id ? 'contained' : 'outlined'}
                  startIcon={<i className={s.icon} />}
                  className='justify-start'
                  onClick={() => {
                    setSpecialtyId(s.id);
                    setDoctorId(null);
                    setSlot(null);
                  }}
                >
                  {s.name} · {s.durationMinutes} min
                </Button>
              ))}
            </div>
          )}

          {step === 1 && (
            <div className='flex flex-col gap-3'>
              {doctors
                .filter((d) => specialtyId && d.specialtyIds.includes(specialtyId))
                .map((d) => {
                  const c = clinicById(d.clinicId)!;
                  const next = firstAvailable(d.id, specialtyId!);
                  const selected = doctorId === d.id;
                  return (
                    <Card
                      key={d.id}
                      variant='outlined'
                      component='button'
                      type='button'
                      onClick={() => {
                        setDoctorId(d.id);
                        setSlot(null);
                        setJoined(false);
                      }}
                      aria-pressed={selected}
                      className='flex items-center gap-4 p-4 text-start cursor-pointer'
                      sx={{ borderColor: selected ? 'primary.main' : undefined, bgcolor: 'transparent', font: 'inherit' }}
                    >
                      <Avatar>{d.name.split(' ')[1]?.[0]}</Avatar>
                      <div className='flex-1'>
                        <Typography className='font-medium' color='text.primary'>
                          {d.name}
                        </Typography>
                        <Typography variant='body2' color='text.secondary'>
                          {c.name} · {c.city} · ★ {d.rating}
                        </Typography>
                      </div>
                      <div className='text-end'>
                        <Typography variant='body2' className='font-medium'>
                          {formatMoney(specialty!.priceByClinic[c.id]!, c)}
                        </Typography>
                        <Typography variant='caption' color='text.secondary'>
                          {next ? `Desde ${formatDay(next.date, { weekday: 'short', day: 'numeric' })}` : 'Sin cupos'}
                        </Typography>
                      </div>
                    </Card>
                  );
                })}
            </div>
          )}

          {step === 2 &&
            (days.length > 0 ? (
              <div className='flex flex-col gap-4'>
                <Typography variant='body2' color='text.secondary'>
                  Próximos cupos de {doctor?.name} · hora de {clinic?.city}
                </Typography>
                {days.slice(0, 7).map((d) => {
                  const free = d.slots.filter((s) => s.available);
                  const open = expanded === d.date;
                  return (
                    <div key={d.date} className='flex flex-col gap-2'>
                      <Typography className='font-medium first-letter:uppercase'>{formatDay(d.date)}</Typography>
                      <div className='flex flex-wrap gap-2'>
                        {(open ? free : free.slice(0, 4)).map((s) => {
                          const selected = slot?.date === d.date && slot.time === s.time;
                          return (
                            <Chip
                              key={s.time}
                              label={s.time}
                              clickable
                              color={selected ? 'primary' : 'default'}
                              variant={selected ? 'filled' : 'outlined'}
                              onClick={() => setSlot({ date: d.date, time: s.time })}
                            />
                          );
                        })}
                        {free.length > 4 && !open && (
                          <Chip label={`+${free.length - 4} más`} variant='outlined' onClick={() => setExpanded(d.date)} />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className='flex flex-col gap-4'>
                <Typography variant='h6'>{doctor?.name} no tiene cupos en los próximos 30 días</Typography>
                <Button variant='contained' disabled={joined} onClick={() => setJoined(true)} className='self-start'>
                  {joined ? 'Ya estás en la lista de espera' : 'Avisarme cuando haya cupo'}
                </Button>
                {alternatives.length > 0 && (
                  <>
                    <Typography color='text.secondary'>O reserva con otro médico de {specialty?.name}:</Typography>
                    {alternatives.map(({ d, next }) => (
                      <Button key={d.id} variant='outlined' className='justify-between' onClick={() => setDoctorId(d.id)}>
                        <span>{d.name}</span>
                        <span>
                          {formatDay(next!.date, { weekday: 'short', day: 'numeric' })} · {next!.time}
                        </span>
                      </Button>
                    ))}
                  </>
                )}
              </div>
            ))}

          {step === 3 && (
            <div className='flex flex-col gap-4'>
              <BookingSummary clinic={clinic} specialty={specialty} doctor={doctor} date={slot?.date ?? null} time={slot?.time ?? null} />
              <TextField
                label='Motivo de la consulta (opcional)'
                value={reason}
                onChange={(e) => setReason(e.target.value.slice(0, 500))}
                multiline
                minRows={2}
              />
            </div>
          )}

          <div className='flex justify-between gap-4 mbs-auto max-md:fixed max-md:left-0 max-md:right-0 max-md:z-[1100] max-md:p-4 max-md:bg-backgroundPaper max-md:shadow-lg' style={{ bottom: 64 }}>
            <Button variant='outlined' disabled={step === 0} onClick={back}>
              Atrás
            </Button>
            {step < 3 ? (
              <Button variant='contained' disabled={!complete[step]} onClick={() => setStep((s) => s + 1)}>
                Siguiente
              </Button>
            ) : (
              <Button variant='contained' color='success'>
                Confirmar y pagar
              </Button>
            )}
          </div>
        </div>
      </Card>
      <StatePanel state={{ variant: 'C', step: STEPS[step]!.title, specialtyId, doctorId, clinicId: doctor?.clinicId ?? null, slot, reason, joined }} />
    </>
  );
}
