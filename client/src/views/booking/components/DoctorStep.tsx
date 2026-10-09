'use client';

import { DoctorRatingBadge } from '@/views/reviews/components/DoctorRatingBadge';
import type { Booking } from '../useBooking';
import { OptionStep } from './OptionStep';

export function DoctorStep({ booking }: { booking: Booking }) {
  return (
    <OptionStep
      name='doctor'
      options={booking.options.doctors}
      selected={booking.state.doctor}
      onSelect={(option) => booking.dispatch({ type: 'select', field: 'doctor', option })}
      loading={booking.loading.doctors}
      empty='No hay médicos de esta especialidad en la sede.'
      describe={(d) => ({
        content: (
          <DoctorRatingBadge ratingAvg={(d.meta?.ratingAvg as number | null) ?? null} ratingCount={(d.meta?.ratingCount as number) ?? 0} />
        ),
      })}
    />
  );
}
