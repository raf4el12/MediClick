'use client';

// PROTOTIPO UI-06 — Tres variantes de la creación administrativa, conmutables con `?variant=`,
// en `/appointments` ("Nueva cita"). Datos falsos; "Crear cita" no llama a la API.
//   A — diálogo con wizard vertical, paciente al final, sin sobrecupo.
//   B — diálogo de una sola pantalla, paciente primero, sobrecupo con interruptor.
//   C — página completa en lugar del listado, paciente primero, sobrecupo como acción secundaria.

import { useState } from 'react';
import Alert from '@mui/material/Alert';
import Autocomplete from '@mui/material/Autocomplete';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControlLabel from '@mui/material/FormControlLabel';
import MenuItem from '@mui/material/MenuItem';
import Step from '@mui/material/Step';
import StepContent from '@mui/material/StepContent';
import StepLabel from '@mui/material/StepLabel';
import Stepper from '@mui/material/Stepper';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import {
  type Patient,
  clinicById,
  daysFor,
  doctorById,
  doctors,
  patients,
  specialties,
  specialtyById,
} from '@/views/patient/book/prototype/fixtures';
import { BookingSummary, DayStrip, HourGrid, MonthCalendar, OptionCard, StatePanel } from '@/views/patient/book/prototype/widgets';

// El personal trabaja en una sede fija (la de su sesión).
const STAFF_CLINIC_ID = 1;

export const adminVariants = [
  { key: 'A', name: 'Diálogo · wizard vertical' },
  { key: 'B', name: 'Diálogo · una pantalla' },
  { key: 'C', name: 'Página completa' },
];

function PatientSearch({ value, onChange, autoFocus }: { value: Patient | null; onChange: (p: Patient | null) => void; autoFocus?: boolean }) {
  return (
    <Autocomplete
      options={patients}
      value={value}
      onChange={(_, p) => onChange(p)}
      getOptionLabel={(p) => `${p.name} · ${p.document}`}
      filterOptions={(opts, { inputValue }) =>
        inputValue.trim().length < 2
          ? []
          : opts.filter((p) => `${p.name} ${p.document}`.toLowerCase().includes(inputValue.trim().toLowerCase()))
      }
      noOptionsText='Escribe al menos 2 letras del nombre o documento'
      renderInput={(params) => <TextField {...params} label='Paciente' autoFocus={autoFocus} placeholder='Nombre o documento' />}
    />
  );
}

function useAdminBooking() {
  const [specialtyId, setSpecialtyId] = useState<number | null>(null);
  const [doctorId, setDoctorId] = useState<number | null>(null);
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [overbook, setOverbook] = useState(false);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [reason, setReason] = useState('');
  const clinic = clinicById(STAFF_CLINIC_ID);
  const specialty = specialtyById(specialtyId);
  const doctor = doctorById(doctorId);
  const doctorOptions = doctors.filter((d) => d.clinicId === STAFF_CLINIC_ID && specialtyId && d.specialtyIds.includes(specialtyId));
  const days = doctorId && specialtyId ? daysFor(doctorId, specialtyId) : [];
  return {
    state: { specialtyId, doctorId, date, time, overbook, patientId: patient?.id ?? null, reason },
    clinic,
    specialty,
    doctor,
    doctorOptions,
    days,
    patient,
    setPatient,
    reason,
    setReason,
    pickSpecialty: (id: number) => {
      setSpecialtyId(id);
      setDoctorId(null);
      setDate(null);
      setTime(null);
    },
    pickDoctor: (id: number) => {
      setDoctorId(id);
      setDate(null);
      setTime(null);
    },
    pickDate: (d: string) => {
      setDate(d);
      setTime(null);
    },
    pickTime: (t: string, isOverbook: boolean) => {
      setTime(t);
      setOverbook(isOverbook);
    },
  };
}

function VariantA({ onClose }: { onClose: () => void }) {
  const b = useAdminBooking();
  const [step, setStep] = useState(0);
  const done = [!!b.state.specialtyId, !!b.state.doctorId, !!b.state.time, !!b.patient, true];
  const nav = (
    <div className='flex gap-2 mbs-3'>
      <Button size='small' disabled={step === 0} onClick={() => setStep((s) => s - 1)}>
        Atrás
      </Button>
      {step < 4 && (
        <Button size='small' variant='contained' disabled={!done[step]} onClick={() => setStep((s) => s + 1)}>
          Siguiente
        </Button>
      )}
    </div>
  );
  return (
    <>
      <DialogContent>
        <Stepper activeStep={step} orientation='vertical'>
          <Step>
            <StepLabel>Especialidad</StepLabel>
            <StepContent>
              <div className='grid gap-2 sm:grid-cols-2'>
                {specialties.map((s) => (
                  <OptionCard key={s.id} name='adminA-spec' selected={b.state.specialtyId === s.id} onSelect={() => b.pickSpecialty(s.id)} icon={s.icon} title={s.name} />
                ))}
              </div>
              {nav}
            </StepContent>
          </Step>
          <Step>
            <StepLabel>Médico</StepLabel>
            <StepContent>
              <div className='grid gap-2'>
                {b.doctorOptions.map((d) => (
                  <OptionCard key={d.id} name='adminA-doc' selected={b.state.doctorId === d.id} onSelect={() => b.pickDoctor(d.id)} title={d.name} meta={`★ ${d.rating}`} />
                ))}
              </div>
              {nav}
            </StepContent>
          </Step>
          <Step>
            <StepLabel>Cupo</StepLabel>
            <StepContent>
              <div className='grid gap-4 sm:grid-cols-[280px_1fr]'>
                <MonthCalendar days={b.days} value={b.state.date} onChange={b.pickDate} />
                <HourGrid day={b.days.find((d) => d.date === b.state.date)} value={b.state.time} onChange={b.pickTime} />
              </div>
              {nav}
            </StepContent>
          </Step>
          <Step>
            <StepLabel>Paciente</StepLabel>
            <StepContent>
              <PatientSearch value={b.patient} onChange={b.setPatient} />
              {nav}
            </StepContent>
          </Step>
          <Step>
            <StepLabel>Resumen</StepLabel>
            <StepContent>
              <BookingSummary online={false} clinic={b.clinic} specialty={b.specialty} doctor={b.doctor} date={b.state.date} time={b.state.time} />
              <Typography className='mbs-2'>Paciente: {b.patient?.name}</Typography>
              {nav}
            </StepContent>
          </Step>
        </Stepper>
        <StatePanel state={{ variant: 'admin-A', step, ...b.state }} />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant='contained' disabled={step < 4}>
          Crear cita
        </Button>
      </DialogActions>
    </>
  );
}

function VariantB({ onClose }: { onClose: () => void }) {
  const b = useAdminBooking();
  const [allowOverbook, setAllowOverbook] = useState(false);
  const ready = !!(b.patient && b.state.time);
  return (
    <>
      <DialogContent className='flex flex-col gap-4'>
        <PatientSearch value={b.patient} onChange={b.setPatient} autoFocus />
        <div className='grid gap-4 sm:grid-cols-2'>
          <TextField select label='Especialidad' value={b.state.specialtyId ?? ''} onChange={(e) => b.pickSpecialty(Number(e.target.value))}>
            {specialties.map((s) => (
              <MenuItem key={s.id} value={s.id}>
                {s.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField select label='Médico' value={b.state.doctorId ?? ''} disabled={!b.state.specialtyId} onChange={(e) => b.pickDoctor(Number(e.target.value))}>
            {b.doctorOptions.map((d) => (
              <MenuItem key={d.id} value={d.id}>
                {d.name}
              </MenuItem>
            ))}
          </TextField>
        </div>
        {b.state.doctorId && (
          <>
            <DayStrip days={b.days} value={b.state.date} onChange={b.pickDate} />
            <FormControlLabel
              control={<Switch checked={allowOverbook} onChange={(_, v) => setAllowOverbook(v)} />}
              label='Permitir sobrecupo (cita sobre un cupo ocupado)'
            />
            <HourGrid day={b.days.find((d) => d.date === b.state.date)} value={b.state.time} onChange={b.pickTime} allowOverbook={allowOverbook} />
            {b.state.overbook && <Alert severity='warning'>Vas a crear un sobrecupo: el médico tendrá dos citas a la misma hora.</Alert>}
          </>
        )}
        <TextField label='Motivo (opcional)' value={b.reason} onChange={(e) => b.setReason(e.target.value.slice(0, 500))} />
        <StatePanel state={{ variant: 'admin-B', allowOverbook, ...b.state }} />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant='contained' disabled={!ready}>
          {b.state.overbook ? 'Crear sobrecupo' : 'Crear cita'}
        </Button>
      </DialogActions>
    </>
  );
}

function VariantC({ onClose }: { onClose: () => void }) {
  const b = useAdminBooking();
  const ready = !!(b.patient && b.state.time);
  return (
    <div className='flex flex-col gap-4'>
      <div className='flex items-center justify-between'>
        <div>
          <Typography variant='h4'>Nueva cita</Typography>
          <Typography color='text.secondary'>{b.clinic?.name}</Typography>
        </div>
        <Button onClick={onClose} startIcon={<i className='ri-arrow-left-line' />}>
          Volver a citas
        </Button>
      </div>
      <div className='grid gap-6 lg:grid-cols-[380px_1fr]'>
        <div className='flex flex-col gap-4'>
          <Card>
            <CardContent className='flex flex-col gap-3'>
              <Typography variant='h6'>1. Paciente</Typography>
              <PatientSearch value={b.patient} onChange={b.setPatient} autoFocus />
              {b.patient && (
                <Typography variant='body2' color='text.secondary'>
                  {b.patient.email}
                </Typography>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className='flex flex-col gap-3'>
              <Typography variant='h6'>2. Especialidad y médico</Typography>
              <div className='flex flex-wrap gap-2'>
                {specialties.map((s) => (
                  <Button key={s.id} size='small' variant={b.state.specialtyId === s.id ? 'contained' : 'outlined'} onClick={() => b.pickSpecialty(s.id)}>
                    {s.name}
                  </Button>
                ))}
              </div>
              {b.doctorOptions.map((d) => (
                <OptionCard key={d.id} name='adminC-doc' selected={b.state.doctorId === d.id} onSelect={() => b.pickDoctor(d.id)} title={d.name} meta={`★ ${d.rating}`} />
              ))}
            </CardContent>
          </Card>
        </div>
        <Card>
          <CardContent className='flex flex-col gap-4'>
            <Typography variant='h6'>3. Día y hora</Typography>
            {b.state.doctorId ? (
              <div className='grid gap-6 md:grid-cols-[300px_1fr]'>
                <MonthCalendar days={b.days} value={b.state.date} onChange={b.pickDate} />
                <div className='flex flex-col gap-3'>
                  <HourGrid day={b.days.find((d) => d.date === b.state.date)} value={b.state.time} onChange={b.pickTime} allowOverbook />
                  <Typography variant='caption' color='text.secondary'>
                    Las horas en naranja están ocupadas: elegirlas crea un sobrecupo.
                  </Typography>
                </div>
              </div>
            ) : (
              <Typography color='text.secondary'>Elige especialidad y médico.</Typography>
            )}
            <TextField label='Motivo (opcional)' value={b.reason} onChange={(e) => b.setReason(e.target.value.slice(0, 500))} />
            <BookingSummary online={false} clinic={b.clinic} specialty={b.specialty} doctor={b.doctor} date={b.state.date} time={b.state.time} />
            <Button variant='contained' disabled={!ready} className='self-end'>
              {b.state.overbook ? 'Crear sobrecupo' : 'Crear cita'}
            </Button>
          </CardContent>
        </Card>
      </div>
      <StatePanel state={{ variant: 'admin-C', ...b.state }} />
    </div>
  );
}

/** A y B se abren como diálogo; C reemplaza el listado (lo monta `AppointmentsView`). */
export function AdminPrototype({ variant, open, onClose }: { variant: string; open: boolean; onClose: () => void }) {
  if (variant === 'C') return open ? <VariantC onClose={onClose} /> : null;
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth={variant === 'A' ? 'md' : 'sm'}>
      <DialogTitle>Nueva cita</DialogTitle>
      {variant === 'A' ? <VariantA onClose={onClose} /> : <VariantB onClose={onClose} />}
    </Dialog>
  );
}
