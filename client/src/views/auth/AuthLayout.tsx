'use client';

import Link from 'next/link';
import Typography from '@mui/material/Typography';
import classnames from 'classnames';
import Logo from '@/components/layout/shared/Logo';
import Illustrations from '@/components/Illustrations';
import { useImageVariant } from '@core/hooks/useImageVariant';
import { useSettings } from '@core/hooks/useSettings';

type Illustration = 'login' | 'forgot-password' | 'reset-password' | 'verify-email';

interface AuthLayoutProps {
  illustration: Illustration;
  title: string;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
}

const illustrationPath = (name: Illustration, variant: string) =>
  `/images/illustrations/auth/v2-${name}-${variant}.png`;

/** Presentación v2 de Materio para las páginas de acceso: ilustración a la izquierda y panel a la derecha. */
const AuthLayout = ({ illustration, title, subtitle, children }: AuthLayoutProps) => {
  const { settings } = useSettings();

  const authBackground = useImageVariant('/images/pages/auth-v2-mask-light.png', '/images/pages/auth-v2-mask-dark.png');
  const characterIllustration = useImageVariant(
    illustrationPath(illustration, 'light'),
    illustrationPath(illustration, 'dark'),
    illustrationPath(illustration, 'light-border'),
    illustrationPath(illustration, 'dark-border'),
  );

  return (
    <div className='flex bs-full justify-center'>
      <div
        className={classnames(
          'flex bs-full items-center justify-center flex-1 min-bs-[100dvh] relative p-6 max-md:hidden',
          { 'border-ie': settings.skin === 'bordered' },
        )}
      >
        <div className='plb-12 pis-12'>
          <img src={characterIllustration} alt='' className='max-bs-[500px] max-is-full bs-auto' />
        </div>
        <Illustrations leftTree='/images/illustrations/objects/tree-2.png' rightTree={null} maskImg={authBackground} />
      </div>
      <main className='flex justify-center items-center bs-full min-bs-[100dvh] bg-backgroundPaper !min-is-full p-6 md:!min-is-[unset] md:p-12 md:is-[480px]'>
        <Link
          href='/'
          aria-label='MediClick, ir a la página de inicio'
          className='absolute block-start-5 sm:block-start-[33px] inline-start-6 sm:inline-start-[38px]'
        >
          <Logo standalone />
        </Link>
        <div className='flex flex-col gap-5 is-full sm:is-auto md:is-full sm:max-is-[400px] md:max-is-[unset] mbs-12 md:mbs-0'>
          <div>
            <Typography variant='h4' component='h1'>
              {title}
            </Typography>
            {subtitle && <Typography className='mbs-1'>{subtitle}</Typography>}
          </div>
          {children}
        </div>
      </main>
    </div>
  );
};

export default AuthLayout;
