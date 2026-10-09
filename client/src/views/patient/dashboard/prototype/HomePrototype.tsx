'use client';

// PROTOTIPO UI-10 — Tres variantes de Inicio, conmutables con `?variant=`.

import { useSearchParams } from 'next/navigation';
import { PrototypeSwitcher } from '@/components/prototype/PrototypeSwitcher';
import { HomeA, HomeB, HomeC } from './HomeVariants';

export default function HomePrototype() {
  const variant = useSearchParams().get('variant') ?? 'A';
  return (
    <>
      {variant === 'A' && <HomeA />}
      {variant === 'B' && <HomeB />}
      {variant === 'C' && <HomeC />}
      <PrototypeSwitcher
        variants={[
          { key: 'A', name: 'Tablero' },
          { key: 'B', name: 'Pendientes primero' },
          { key: 'C', name: 'Celular primero' },
        ]}
      />
    </>
  );
}
