'use client';

// PROTOTIPO UI-06 — Tres variantes del flujo de reserva, conmutables con `?variant=`,
// sobre `/patient/book` y el diálogo de `/appointments`.

import { useSearchParams } from 'next/navigation';
import Typography from '@mui/material/Typography';
import { PrototypeSwitcher } from '@/components/prototype/PrototypeSwitcher';
import { VariantA, variantAName } from './VariantA';
import { VariantB, variantBName } from './VariantB';
import { VariantC, variantCName } from './VariantC';

export default function BookPrototype() {
  const variant = useSearchParams().get('variant') ?? 'A';

  return (
    <div className='flex flex-col gap-4'>
      <div>
        <Typography variant='h4'>Reservar cita</Typography>
        <Typography color='text.secondary'>Elige cuándo y con quién quieres atenderte.</Typography>
      </div>
      {variant === 'A' && <VariantA />}
      {variant === 'B' && <VariantB />}
      {variant === 'C' && <VariantC />}
      <PrototypeSwitcher
        variants={[
          { key: 'A', name: variantAName },
          { key: 'B', name: variantBName },
          { key: 'C', name: variantCName },
        ]}
      />
    </div>
  );
}
