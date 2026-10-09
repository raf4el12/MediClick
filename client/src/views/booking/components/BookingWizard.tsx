'use client';

import { useState } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import Stepper from '@mui/material/Stepper';
import Typography from '@mui/material/Typography';
import type { BookingPreset, BookingStep } from '../model/types';
import { useBooking } from '../useBooking';
import { ClinicStep } from './ClinicStep';
import { DoctorStep } from './DoctorStep';
import { ReviewStep } from './ReviewStep';
import { SlotStep } from './SlotStep';
import { SpecialtyStep } from './SpecialtyStep';

const STEP_COPY: Partial<Record<BookingStep, { label: string; title: string }>> = {
  clinic: { label: 'Sede', title: '¿En qué sede te atenderás?' },
  specialty: { label: 'Especialidad', title: '¿Qué especialidad necesitas?' },
  doctor: { label: 'Médico', title: 'Elige a tu médico' },
  slot: { label: 'Cupo', title: 'Elige día y hora' },
  review: { label: 'Resumen', title: 'Revisa y confirma' },
};

/** Reserva en línea del paciente: wizard horizontal (decisión de UI-06). */
export function BookingWizard({ preset }: { preset?: BookingPreset }) {
  const booking = useBooking('online', { preset });
  const { view, dispatch } = booking;
  const [redirecting, setRedirecting] = useState(false);
  const index = view.steps.indexOf(view.activeStep);
  const copy = STEP_COPY[view.activeStep]!;
  const isReview = view.activeStep === 'review';

  const confirm = async () => {
    const result = await booking.submit();
    if (result?.kind === 'redirect') {
      setRedirecting(true);
      window.location.assign(result.url);
    }
  };

  if (redirecting) {
    return (
      <Card>
        <CardContent className='flex flex-col items-center text-center gap-3 plb-12'>
          <CircularProgress aria-label='Redirigiendo' />
          <Typography variant='h5' component='p'>
            Te llevamos a Mercado Pago…
          </Typography>
          <Typography color='text.secondary'>Tu cupo quedó reservado mientras completas el pago.</Typography>
        </CardContent>
      </Card>
    );
  }

  if (booking.loading.preset) {
    return (
      <Card>
        <CardContent className='flex justify-center plb-12'>
          <CircularProgress aria-label='Preparando la reserva' />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className='max-md:mbe-20'>
      <CardContent className='max-sm:hidden'>
        <Stepper activeStep={index} alternativeLabel>
          {view.steps.map((step) => (
            <Step key={step}>
              <StepLabel>{STEP_COPY[step]!.label}</StepLabel>
            </Step>
          ))}
        </Stepper>
      </CardContent>
      <CardContent className='sm:hidden'>
        <Typography variant='body2' color='text.secondary'>
          Paso {index + 1} de {view.steps.length} · {copy.label}
        </Typography>
      </CardContent>
      <Divider />
      <CardContent className='flex flex-col gap-4'>
        <div>
          <Typography variant='h5' component='h2'>
            {copy.title}
          </Typography>
          {view.activeStep === 'slot' && view.summary.doctor && (
            <Typography color='text.secondary'>
              {view.summary.doctor} · {view.summary.specialty} · {view.summary.clinic}
            </Typography>
          )}
        </div>
        {booking.error && <Alert severity='error'>{booking.error}</Alert>}
        {view.activeStep === 'clinic' && <ClinicStep booking={booking} />}
        {view.activeStep === 'specialty' && <SpecialtyStep booking={booking} />}
        {view.activeStep === 'doctor' && <DoctorStep booking={booking} />}
        {view.activeStep === 'slot' && <SlotStep booking={booking} onChooseOtherDoctor={() => dispatch({ type: 'back' })} />}
        {isReview && <ReviewStep booking={booking} />}
      </CardContent>
      <Divider />
      {/* En celular las acciones quedan fijas sobre la barra inferior del portal. */}
      <CardContent className='flex justify-between gap-4 max-sm:fixed max-sm:left-0 max-sm:right-0 max-sm:z-[1100] max-sm:bg-backgroundPaper max-sm:shadow-lg max-sm:bottom-[calc(56px+env(safe-area-inset-bottom))]'>
        <Button
          variant='outlined'
          disabled={index === 0 || booking.submitting}
          onClick={() => dispatch({ type: 'back' })}
          startIcon={<i className='ri-arrow-left-line' />}
        >
          Atrás
        </Button>
        {isReview ? (
          <Button variant='contained' color='success' disabled={booking.submitting || view.missing.length > 0} onClick={confirm}>
            {booking.submitting ? <CircularProgress size={22} color='inherit' aria-label='Confirmando' /> : 'Confirmar y pagar'}
          </Button>
        ) : (
          <Button variant='contained' disabled={!view.canAdvance} onClick={() => dispatch({ type: 'next' })} endIcon={<i className='ri-arrow-right-line' />}>
            Siguiente
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
