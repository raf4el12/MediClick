'use client';

// PROTOTIPO UI-06 — Variante A: wizard horizontal (checkout de Materio).
// Sede primero · calendario mensual + horas · "Atrás" conserva lo elegido ·
// sin cupos ofrece la lista de espera · acciones fijas sobre la barra inferior en celular.

import { useState } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Divider from '@mui/material/Divider';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import Stepper from '@mui/material/Stepper';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import {
  clinicById,
  clinics,
  daysFor,
  doctorById,
  doctors,
  formatMoney,
  specialties,
  specialtyById,
} from './fixtures';
import { BookingSummary, HourGrid, MonthCalendar, OptionCard, StatePanel } from './widgets';

const STEPS = ['Sede', 'Especialidad', 'Médico', 'Cupo', 'Resumen'];

export const variantAName = 'Wizard horizontal';

export function VariantA() {
  const [step, setStep] = useState(0);
  const [clinicId, setClinicId] = useState<number | null>(null);
  const [specialtyId, setSpecialtyId] = useState<number | null>(null);
  const [doctorId, setDoctorId] = useState<number | null>(null);
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [joinedWaitlist, setJoinedWaitlist] = useState(false);

  const clinic = clinicById(clinicId);
  const specialty = specialtyById(specialtyId);
  const doctor = doctorById(doctorId);
  const days = doctorId && specialtyId ? daysFor(doctorId, specialtyId) : [];
  const hasDays = days.some((d) => d.slots.some((s) => s.available));

  // Cambiar una elección invalida lo que depende de ella; "Atrás" no borra nada.
  const pickClinic = (id: number) => {
    if (id === clinicId) return;
    setClinicId(id);
    setSpecialtyId(null);
    setDoctorId(null);
    setDate(null);
    setTime(null);
  };
  const pickSpecialty = (id: number) => {
    if (id === specialtyId) return;
    setSpecialtyId(id);
    setDoctorId(null);
    setDate(null);
    setTime(null);
  };
  const pickDoctor = (id: number) => {
    if (id === doctorId) return;
    setDoctorId(id);
    setDate(null);
    setTime(null);
    setJoinedWaitlist(false);
  };

  const complete = [!!clinicId, !!specialtyId, !!doctorId, !!date && !!time, true];
  const canNext = complete[step];

  const stepContent = [
    <div key='clinic' className='grid gap-4 sm:grid-cols-3'>
      {clinics.map((c) => (
        <OptionCard
          key={c.id}
          name='clinic'
          selected={clinicId === c.id}
          onSelect={() => pickClinic(c.id)}
          icon='ri-building-line'
          title={c.name}
          content={`${c.city} · precios en ${c.currency}`}
        />
      ))}
    </div>,
    <div key='specialty' className='grid gap-4 sm:grid-cols-3'>
      {specialties.map((s) => (
        <OptionCard
          key={s.id}
          name='specialty'
          selected={specialtyId === s.id}
          onSelect={() => pickSpecialty(s.id)}
          icon={s.icon}
          title={s.name}
          meta={clinic ? formatMoney(s.priceByClinic[clinic.id]!, clinic) : undefined}
          content={`${s.durationMinutes} min`}
        />
      ))}
    </div>,
    <div key='doctor' className='grid gap-4 sm:grid-cols-2'>
      {doctors
        .filter((d) => d.clinicId === clinicId && specialtyId && d.specialtyIds.includes(specialtyId))
        .map((d) => (
          <OptionCard
            key={d.id}
            name='doctor'
            selected={doctorId === d.id}
            onSelect={() => pickDoctor(d.id)}
            icon='ri-user-heart-line'
            title={d.name}
            meta={`★ ${d.rating} (${d.reviews})`}
          />
        ))}
      {doctors.filter((d) => d.clinicId === clinicId && specialtyId && d.specialtyIds.includes(specialtyId)).length === 0 && (
        <Alert severity='info'>No hay médicos de esta especialidad en la sede. Prueba con otra sede.</Alert>
      )}
    </div>,
    hasDays ? (
      <div key='slot' className='grid gap-6 md:grid-cols-[320px_1fr]'>
        <MonthCalendar
          days={days}
          value={date}
          onChange={(d) => {
            setDate(d);
            setTime(null);
          }}
        />
        <div className='flex flex-col gap-3'>
          <Typography className='font-medium'>Cupos disponibles</Typography>
          <HourGrid day={days.find((d) => d.date === date)} value={time} onChange={(t) => setTime(t)} />
          <Typography variant='body2' color='text.secondary'>
            Horas de {clinic?.city} ({clinic?.timezone}).
          </Typography>
        </div>
      </div>
    ) : (
      <div key='empty' className='flex flex-col items-center text-center gap-3 plb-6'>
        <i className='ri-calendar-close-line text-5xl' />
        <Typography variant='h6'>{doctor?.name} no tiene cupos en los próximos 30 días</Typography>
        <Typography color='text.secondary'>
          Anótate en la lista de espera y te avisaremos cuando se libere un cupo.
        </Typography>
        <Button variant='contained' disabled={joinedWaitlist} onClick={() => setJoinedWaitlist(true)}>
          {joinedWaitlist ? 'Ya estás en la lista de espera' : 'Unirme a la lista de espera'}
        </Button>
      </div>
    ),
    <div key='review' className='grid gap-6 md:grid-cols-2'>
      <div className='flex flex-col gap-4'>
        <TextField
          label='Motivo de la consulta (opcional)'
          multiline
          minRows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value.slice(0, 500))}
          helperText={`${reason.length}/500`}
        />
      </div>
      <BookingSummary clinic={clinic} specialty={specialty} doctor={doctor} date={date} time={time} />
    </div>,
  ];

  return (
    <>
      <Card>
        <CardContent className='max-sm:hidden'>
          <Stepper activeStep={step} alternativeLabel>
            {STEPS.map((label, i) => (
              <Step key={label} completed={i < step && complete[i]}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </CardContent>
        <CardContent className='sm:hidden'>
          <Typography variant='body2' color='text.secondary'>
            Paso {step + 1} de {STEPS.length}
          </Typography>
          <Typography variant='h6'>{STEPS[step]}</Typography>
        </CardContent>
        <Divider />
        <CardContent className='flex flex-col gap-4'>
          <Typography variant='h5' className='max-sm:hidden'>
            {['¿En qué sede te atenderás?', '¿Qué especialidad necesitas?', 'Elige a tu médico', 'Elige día y hora', 'Revisa y confirma'][step]}
          </Typography>
          {stepContent[step]}
        </CardContent>
        <Divider />
        <CardContent className='flex justify-between gap-4 max-sm:fixed max-sm:left-0 max-sm:right-0 max-sm:z-[1100] max-sm:bg-backgroundPaper max-sm:shadow-lg' style={{ bottom: 64 }}>
          <Button variant='outlined' disabled={step === 0} onClick={() => setStep((s) => s - 1)} startIcon={<i className='ri-arrow-left-line' />}>
            Atrás
          </Button>
          {step < STEPS.length - 1 ? (
            <Button variant='contained' disabled={!canNext} onClick={() => setStep((s) => s + 1)} endIcon={<i className='ri-arrow-right-line' />}>
              Siguiente
            </Button>
          ) : (
            <Button variant='contained' color='success'>
              Confirmar y pagar
            </Button>
          )}
        </CardContent>
      </Card>
      <StatePanel state={{ variant: 'A', step: STEPS[step], clinicId, specialtyId, doctorId, date, time, reason, joinedWaitlist }} />
    </>
  );
}
