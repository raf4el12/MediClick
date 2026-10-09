'use client';

import { formatPrice } from '../format';
import type { Booking } from '../useBooking';
import { OptionStep } from './OptionStep';

export function SpecialtyStep({ booking }: { booking: Booking }) {
  const currency = booking.view.summary.currency;

  return (
    <OptionStep
      name='specialty'
      options={booking.options.specialties}
      selected={booking.state.specialty}
      onSelect={(option) => booking.dispatch({ type: 'select', field: 'specialty', option })}
      loading={booking.loading.specialties}
      empty='No hay especialidades disponibles en esta sede.'
      describe={(s) => {
        const price = s.meta?.price as number | undefined;
        const duration = s.meta?.duration as number | null | undefined;
        return {
          meta: price !== undefined && currency ? formatPrice(price, currency) : undefined,
          content: duration ? `${duration} min` : undefined,
        };
      }}
    />
  );
}
