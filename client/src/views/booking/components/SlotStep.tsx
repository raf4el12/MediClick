'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { registerLocale } from 'react-datepicker';
import { es } from 'date-fns/locale/es';
import AppReactDatepicker from '@/libs/styles/AppReactDatepicker';
import { waitlistService } from '@/services/waitlist.service';
import { extractApiError } from '@/utils/extractApiError';
import { notify } from '@/utils/notify';
import { JoinWaitlistDialog } from '@/views/waitlist/components/JoinWaitlistDialog';
import type { JoinWaitlistFormValues } from '@/views/waitlist/functions/waitlist.schema';
import { formatDay } from '../format';
import type { Booking } from '../useBooking';

registerLocale('es', es);

// El calendario trabaja con fechas locales del navegador; el día de la sede viaja como `YYYY-MM-DD`.
const toDate = (isoDay: string) => {
  const [y, m, d] = isoDay.split('-').map(Number) as [number, number, number];
  return new Date(y, m - 1, d);
};
const toIsoDay = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

// El contenedor de react-datepicker se anuncia en inglés como diálogo modal; en línea es un grupo.
function CalendarGroup({ className, children }: { className?: string; children?: React.ReactNode }) {
  return (
    <div className={className} role='group' aria-label='Calendario de días con cupos'>
      {children}
    </div>
  );
}

// Los días con cupos se marcan con el primario (AA); "hoy" sin cupos no se resalta.
const calendarSx = {
  '& .booking-day-available:not(.react-datepicker__day--selected)': {
    fontWeight: 600,
    color: 'var(--mui-palette-primary-main)',
    boxShadow: 'inset 0 0 0 1px var(--mui-palette-primary-main)',
  },
  '& .react-datepicker .react-datepicker__day--today.react-datepicker__day--disabled:not(.react-datepicker__day--selected):not(:empty)': {
    backgroundColor: 'transparent',
    color: 'var(--mui-palette-text-disabled)',
  },
};

interface SlotStepProps {
  booking: Booking;
  /** Vuelve a elegir médico cuando el actual no tiene cupos. */
  onChooseOtherDoctor: () => void;
  /** Ofrecer lista de espera y otro médico sin cupos (la reserva sí; reagendar no). */
  allowAlternatives?: boolean;
}

export function SlotStep({ booking, onChooseOtherDoctor, allowAlternatives = true }: SlotStepProps) {
  const { state, view, options, loading, dispatch } = booking;
  const [month, setMonth] = useState<string | null>(null);
  const [waitlistOpen, setWaitlistOpen] = useState(false);
  const queryClient = useQueryClient();

  const join = useMutation({
    mutationFn: (values: JoinWaitlistFormValues) =>
      waitlistService.join({
        specialtyId: values.specialtyId,
        doctorId: values.doctorId,
        dateFrom: values.dateFrom,
        dateTo: values.dateTo,
        timePreference: values.timePreference,
        notes: values.notes || undefined,
      }),
    onSuccess: () => {
      setWaitlistOpen(false);
      notify('Te uniste a la lista de espera', 'success');
      void queryClient.invalidateQueries({ queryKey: ['waitlist', 'my-entries'] });
    },
  });

  if (loading.days) return <Typography color='text.secondary'>Buscando días con cupos…</Typography>;

  if (view.notice === 'no-slots' && !allowAlternatives) {
    return <Alert severity='info'>{state.doctor?.label} no tiene cupos en los próximos dos meses.</Alert>;
  }

  if (view.notice === 'no-slots') {
    return (
      <div className='flex flex-col items-center text-center gap-3 plb-6'>
        <i className='ri-calendar-close-line text-5xl' aria-hidden='true' />
        <Typography variant='h6' component='p'>
          {state.doctor?.label} no tiene cupos en los próximos dos meses
        </Typography>
        {state.mode === 'online' && (
          <Typography color='text.secondary'>Anótate en la lista de espera y te avisaremos cuando se libere un cupo.</Typography>
        )}
        <div className='flex flex-wrap justify-center gap-3'>
          {state.mode === 'online' && (
            <Button variant='contained' onClick={() => setWaitlistOpen(true)}>
              Unirme a la lista de espera
            </Button>
          )}
          <Button variant='outlined' onClick={onChooseOtherDoctor}>
            Elegir otro médico
          </Button>
        </div>
        {state.mode === 'online' && (
          <JoinWaitlistDialog
            open={waitlistOpen}
            onClose={() => setWaitlistOpen(false)}
            onSubmit={async (values) => {
              await join.mutateAsync(values);
            }}
            submitting={join.isPending}
            error={join.error ? extractApiError(join.error, 'No se pudo unir a la lista de espera').message : null}
            initialValues={{ specialtyId: state.specialty?.id, doctorId: state.doctor?.id }}
          />
        )}
      </div>
    );
  }

  const availableDays = new Set(options.availableDays);
  const visibleMonth = month ?? (state.date ?? booking.today).slice(0, 7);
  const monthHasSlots = options.availableDays.some((d) => d.startsWith(visibleMonth));
  const dayLabel = state.date ? formatDay(state.date) : null;

  return (
    <div className='flex flex-col gap-4'>
      {view.notice === 'slot-taken' && (
        <Alert severity='warning'>El cupo elegido ya fue tomado. Elige otro, por favor.</Alert>
      )}
      <div className='grid gap-6 md:grid-cols-[auto_1fr]'>
        <div className='flex flex-col gap-2'>
          <AppReactDatepicker
            inline
            locale='es'
            selected={state.date ? toDate(state.date) : null}
            onChange={(date: Date | null) => date && dispatch({ type: 'selectDay', date: toIsoDay(date) })}
            onMonthChange={(date: Date) => setMonth(toIsoDay(date).slice(0, 7))}
            minDate={toDate(booking.today)}
            maxDate={toDate(booking.windowEnd)}
            // `filterDate` y no `includeDates`: este último impide navegar a meses sin cupos.
            filterDate={(date: Date) => availableDays.has(toIsoDay(date))}
            dayClassName={(date: Date) => (availableDays.has(toIsoDay(date)) ? 'booking-day-available' : '')}
            boxProps={{ sx: calendarSx }}
            calendarContainer={CalendarGroup}
            chooseDayAriaLabelPrefix='Elegir el'
            disabledDayAriaLabelPrefix='Sin cupos el'
            previousMonthAriaLabel='Mes anterior'
            nextMonthAriaLabel='Mes siguiente'
          />
          {!monthHasSlots && (
            <Typography variant='body2' color='text.secondary'>
              No hay cupos este mes
            </Typography>
          )}
        </div>
        <div className='flex flex-col gap-3 min-is-0'>
          <Typography className='font-medium first-letter:uppercase'>{dayLabel ?? 'Elige un día'}</Typography>
          {loading.slots ? (
            <Typography color='text.secondary'>Cargando cupos…</Typography>
          ) : (
            <div role='group' aria-label={dayLabel ? `Cupos del ${dayLabel}` : 'Cupos'} className='flex flex-wrap gap-2'>
              {options.slots.map((slot) => {
                const selected = state.slot?.scheduleId === slot.scheduleId && state.slot.startTime === slot.startTime;
                return (
                  <Button
                    key={`${slot.scheduleId}-${slot.startTime}`}
                    size='small'
                    variant={selected ? 'contained' : 'outlined'}
                    disabled={!slot.available}
                    aria-pressed={selected}
                    onClick={() => dispatch({ type: 'selectSlot', slot })}
                  >
                    {slot.startTime}
                  </Button>
                );
              })}
            </div>
          )}
          {view.summary.timezone && (
            <Typography variant='body2' color='text.secondary'>
              Horas de la sede ({view.summary.timezone}).
            </Typography>
          )}
        </div>
      </div>
    </div>
  );
}
