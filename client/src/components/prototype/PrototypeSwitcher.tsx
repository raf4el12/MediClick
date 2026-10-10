'use client';

// PROTOTIPO — barra flotante para conmutar variantes con `?variant=`. No se muestra en producción.

import { useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

export type PrototypeVariant = { key: string; name: string };

export function PrototypeSwitcher({ variants }: { variants: PrototypeVariant[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = searchParams.get('variant') ?? variants[0]!.key;
  const index = Math.max(
    0,
    variants.findIndex((v) => v.key === current),
  );

  const go = (delta: number) => {
    const next = variants[(index + delta + variants.length) % variants.length]!;
    const params = new URLSearchParams(searchParams.toString());
    params.set('variant', next.key);
    router.replace(`${pathname}?${params.toString()}`);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest('input, textarea, [contenteditable="true"]')) return;
      if (e.key === 'ArrowLeft') go(-1);
      if (e.key === 'ArrowRight') go(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (process.env.NODE_ENV === 'production') return null;

  const variant = variants[index]!;
  return (
    <div
      role='toolbar'
      aria-label='Variantes del prototipo'
      style={{
        position: 'fixed',
        insetBlockEnd: 96,
        insetInlineStart: '50%',
        transform: 'translateX(-50%)',
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 10px',
        borderRadius: 999,
        background: '#111',
        color: '#fff',
        boxShadow: '0 6px 20px rgba(0,0,0,.35)',
        fontSize: 14,
      }}
    >
      <button type='button' onClick={() => go(-1)} aria-label='Variante anterior' style={{ color: '#fff', background: 'none', border: 0, cursor: 'pointer', fontSize: 18 }}>
        ←
      </button>
      <span>
        {variant.key} — {variant.name}
      </span>
      <button type='button' onClick={() => go(1)} aria-label='Variante siguiente' style={{ color: '#fff', background: 'none', border: 0, cursor: 'pointer', fontSize: 18 }}>
        →
      </button>
    </div>
  );
}
