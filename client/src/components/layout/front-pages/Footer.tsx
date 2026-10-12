import Link from 'next/link';
import Typography from '@mui/material/Typography';
import Logo from '@/components/layout/shared/Logo';

/** Pie de las páginas públicas. */
export default function Footer() {
  return (
    <footer className='mbs-auto' style={{ backgroundColor: 'var(--mui-palette-background-paper)', borderBlockStart: '1px solid var(--mui-palette-divider)' }}>
      <div className='flex flex-wrap items-start justify-between gap-8 max-is-[1200px] mli-auto pli-6 plb-10'>
        <div className='flex flex-col gap-3 max-is-[340px]'>
          <Logo standalone />
          <Typography color='text.secondary'>Reserva y gestiona tus citas médicas en línea, con recordatorios y tu expediente en un solo lugar.</Typography>
        </div>
        <nav aria-label='Enlaces del pie'>
          <ul className='flex flex-col gap-2 m-0 p-0 list-none'>
            <li>
              <Link href='/medicos' className='text-[var(--mui-palette-text-primary)]'>
                Médicos
              </Link>
            </li>
            <li>
              <Link href='/login' className='text-[var(--mui-palette-text-primary)]'>
                Ingresar
              </Link>
            </li>
            <li>
              <Link href='/register' className='text-[var(--mui-palette-text-primary)]'>
                Crear cuenta
              </Link>
            </li>
          </ul>
        </nav>
      </div>
      <Typography variant='body2' color='text.secondary' className='text-center pbe-6 pli-6'>
        © {new Date().getFullYear()} MediClick. Todos los derechos reservados.
      </Typography>
    </footer>
  );
}
