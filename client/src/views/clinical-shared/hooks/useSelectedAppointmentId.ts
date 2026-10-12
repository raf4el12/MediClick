'use client';

import { useCallback } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { parseAppointmentId } from '../functions/selectedAppointment';

/** Cita abierta en el drawer, guardada en `?appointmentId=` para poder compartir y recargar la vista. */
export function useSelectedAppointmentId() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const selectedId = parseAppointmentId(searchParams.get('appointmentId'));

  const select = useCallback((id: number) => router.replace(`${pathname}?appointmentId=${id}`, { scroll: false }), [router, pathname]);
  const clear = useCallback(() => router.replace(pathname, { scroll: false }), [router, pathname]);

  return { selectedId, select, clear };
}
