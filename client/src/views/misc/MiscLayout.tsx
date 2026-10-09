'use client';

import Typography from '@mui/material/Typography';
import classnames from 'classnames';
import Illustrations from '@/components/Illustrations';
import { usePermissions } from '@/hooks/usePermissions';
import { actorFor, homePathFor } from '@configs/navigation';

interface MiscLayoutProps {
  code: string;
  title: string;
  description: string;
  image: string;
  /** Página completa (fuera de los shells) con la decoración de fondo. */
  fullPage?: boolean;
  children: React.ReactNode;
}

/** Inicio del actor con sesión; sin sesión, la página pública. */
export function useHomePath(): string {
  const { roleName } = usePermissions();
  return roleName ? homePathFor(actorFor(roleName)) : '/';
}

/** Presentación de Materio para las páginas de error (404, 401 y 500). */
const MiscLayout = ({ code, title, description, image, fullPage = false, children }: MiscLayoutProps) => (
  <div
    className={classnames('flex items-center justify-center relative p-6 overflow-x-hidden', {
      'min-bs-[100dvh]': fullPage,
    })}
  >
    <div className='flex items-center flex-col text-center gap-10'>
      <div className='flex flex-col gap-2 is-[90vw] sm:is-[unset]'>
        <Typography className='font-medium text-8xl' color='text.primary' aria-hidden='true'>
          {code}
        </Typography>
        <Typography variant='h4' component='h1'>
          {title}
        </Typography>
        <Typography>{description}</Typography>
      </div>
      <img
        alt=''
        src={image}
        className={classnames('object-cover', fullPage ? 'bs-[400px] md:bs-[450px] lg:bs-[500px]' : 'bs-[300px]')}
      />
      <div className='flex flex-wrap justify-center gap-4'>{children}</div>
    </div>
    {fullPage && <Illustrations />}
  </div>
);

export default MiscLayout;
