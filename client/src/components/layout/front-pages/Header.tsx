'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import useScrollTrigger from '@mui/material/useScrollTrigger';
import classnames from 'classnames';
import Logo from '@/components/layout/shared/Logo';
import LinkButton from '@/components/shared/LinkButton';

const LINKS = [
  { href: '/', label: 'Inicio' },
  { href: '/medicos', label: 'Médicos' },
];

/** Encabezado de las páginas públicas (patrón `front-pages/Header` de Materio). */
export default function Header({ portalHref }: { portalHref: string | null }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const scrolled = useScrollTrigger({ threshold: 0, disableHysteresis: true });
  const current = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));

  const actions = portalHref ? (
    <LinkButton href={portalHref} variant='contained'>
      Ir a mi portal
    </LinkButton>
  ) : (
    <>
      <LinkButton href='/login' variant='text'>
        Ingresar
      </LinkButton>
      <LinkButton href='/register' variant='contained' className='max-sm:hidden'>
        Registrarse
      </LinkButton>
    </>
  );

  return (
    <header className='sticky block-start-0 z-[1100] flex justify-center is-full'>
      <div
        className={classnames('flex items-center justify-between gap-4 is-[calc(100%-32px)] max-is-[1152px] pli-4 sm:pli-8 plb-2 rounded-be rounded-bs-none rounded-bl', {
          'shadow-md': scrolled,
        })}
        style={{
          backgroundColor: scrolled ? 'var(--mui-palette-background-paper)' : 'rgb(var(--mui-palette-background-paperChannel) / 0.8)',
          backdropFilter: 'blur(6px)',
          borderEndStartRadius: 'var(--mui-shape-borderRadius)',
          borderEndEndRadius: 'var(--mui-shape-borderRadius)',
        }}
      >
        <div className='flex items-center gap-6'>
          <IconButton className='md:hidden -mis-2' aria-label='Abrir menú' onClick={() => setOpen(true)}>
            <i className='ri-menu-line' aria-hidden />
          </IconButton>
          <Link href='/' aria-label='MediClick, ir al inicio'>
            <Logo standalone />
          </Link>
          <nav aria-label='Principal' className='max-md:hidden'>
            <ul className='flex items-center gap-2 m-0 p-0 list-none'>
              {LINKS.map((l) => (
                <li key={l.href}>
                  <LinkButton href={l.href} color={current(l.href) ? 'primary' : 'inherit'} aria-current={current(l.href) ? 'page' : undefined}>
                    {l.label}
                  </LinkButton>
                </li>
              ))}
            </ul>
          </nav>
        </div>
        <div className='flex items-center gap-2'>{actions}</div>
      </div>
      <Drawer open={open} onClose={() => setOpen(false)} slotProps={{ paper: { className: 'is-64 p-4' } }}>
        <nav aria-label='Principal'>
          <ul className='flex flex-col gap-1 m-0 p-0 list-none'>
            {LINKS.map((l) => (
              <li key={l.href}>
                <LinkButton href={l.href} fullWidth className='justify-start' onClick={() => setOpen(false)} aria-current={current(l.href) ? 'page' : undefined}>
                  {l.label}
                </LinkButton>
              </li>
            ))}
            {!portalHref && (
              <li>
                <LinkButton href='/register' fullWidth className='justify-start' onClick={() => setOpen(false)}>
                  Registrarse
                </LinkButton>
              </li>
            )}
          </ul>
        </nav>
      </Drawer>
    </header>
  );
}
