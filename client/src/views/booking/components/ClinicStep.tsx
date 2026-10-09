'use client';

import type { Booking } from '../useBooking';
import { OptionStep } from './OptionStep';

export function ClinicStep({ booking }: { booking: Booking }) {
  return (
    <OptionStep
      name='clinic'
      options={booking.options.clinics}
      selected={booking.state.clinic}
      onSelect={(option) => booking.dispatch({ type: 'select', field: 'clinic', option })}
      loading={booking.loading.clinics}
      empty='No hay sedes disponibles.'
      describe={(c) => ({ content: `Precios en ${c.meta?.currency as string}` })}
    />
  );
}
