'use client';

// Tres variantes de disponibilidad visual, conmutables con `?variant=`, sobre `/availability`. PROTOTIPO — se descarta.

import { useSearchParams } from 'next/navigation';
import { PrototypeSwitcher } from '@/components/prototype/PrototypeSwitcher';
import { VariantA, VariantB, VariantC } from './Variants';

export default function DisponibilidadPrototype() {
  const variant = useSearchParams().get('variant') ?? 'A';
  return (
    <>
      {variant === 'A' && <VariantA />}
      {variant === 'B' && <VariantB />}
      {variant === 'C' && <VariantC />}
      <PrototypeSwitcher
        variants={[
          { key: 'A', name: 'Calendario con drawer de bloqueo' },
          { key: 'B', name: 'Grilla de reglas + restricciones' },
          { key: 'C', name: 'Mes con lista de restricciones' },
        ]}
      />
    </>
  );
}
