'use client';

// Tres variantes de la jornada del médico, conmutables con `?variant=`, sobre `/doctor`. PROTOTIPO — se descarta.

import { useSearchParams } from 'next/navigation';
import { PrototypeSwitcher } from '@/components/prototype/PrototypeSwitcher';
import { VariantA, VariantB, VariantC } from './Variants';

export default function JornadaPrototype() {
  const variant = useSearchParams().get('variant') ?? 'A';
  return (
    <>
      {variant === 'A' && <VariantA />}
      {variant === 'B' && <VariantB />}
      {variant === 'C' && <VariantC />}
      <PrototypeSwitcher
        variants={[
          { key: 'A', name: 'Panel del día + atención lateral' },
          { key: 'B', name: 'Agenda protagonista + drawer' },
          { key: 'C', name: 'Pestañas Hoy / Semana / Mes' },
        ]}
      />
    </>
  );
}
