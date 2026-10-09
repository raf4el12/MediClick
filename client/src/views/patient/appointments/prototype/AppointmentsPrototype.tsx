'use client';

// PROTOTIPO UI-10 — Tres variantes de Mis citas, conmutables con `?variant=`.

import { useSearchParams } from 'next/navigation';
import Typography from '@mui/material/Typography';
import { PrototypeSwitcher } from '@/components/prototype/PrototypeSwitcher';
import { AppointmentsA, AppointmentsB, AppointmentsC } from './AppointmentsVariants';

export default function AppointmentsPrototype() {
  const variant = useSearchParams().get('variant') ?? 'A';
  return (
    <div className='flex flex-col gap-4'>
      <Typography variant='h4' component='h1'>
        Mis citas
      </Typography>
      {variant === 'A' && <AppointmentsA />}
      {variant === 'B' && <AppointmentsB />}
      {variant === 'C' && <AppointmentsC />}
      <PrototypeSwitcher
        variants={[
          { key: 'A', name: 'Tabla con pestañas' },
          { key: 'B', name: 'Tarjetas' },
          { key: 'C', name: 'Línea de tiempo' },
        ]}
      />
    </div>
  );
}
