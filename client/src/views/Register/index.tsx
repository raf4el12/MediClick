'use client';

import Link from 'next/link';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';
import classnames from 'classnames';
import Logo from '@/components/layout/shared/Logo';
import { useSettings } from '@core/hooks/useSettings';
import { RegisterForm } from './RegisterForm';

/** Registro del paciente con el layout `register-multi-steps` de Materio: ilustración y pasos. */
const RegisterView = () => {
  const { settings } = useSettings();
  const theme = useTheme();

  return (
    <div className='flex bs-full justify-between items-center'>
      <div className={classnames('flex bs-full min-bs-[100dvh] items-center justify-center is-[594px] shrink-0 max-lg:hidden', { 'border-ie': settings.skin === 'bordered' })}>
        <img
          src='/images/illustrations/characters/4.png'
          alt=''
          className={classnames('bs-auto max-bs-[628px] max-is-full', { 'scale-x-[-1]': theme.direction === 'rtl' })}
        />
      </div>
      <main className='flex justify-center items-center bs-full min-bs-[100dvh] is-full bg-backgroundPaper relative'>
        <Link href='/' aria-label='MediClick, ir a la página de inicio' className='absolute block-start-5 sm:block-start-[25px] inline-start-6 sm:inline-start-[25px]'>
          <Logo standalone />
        </Link>
        <div className='flex flex-col gap-6 p-5 sm:p-8 is-full max-is-[760px] mbs-16 sm:mbs-12'>
          <div>
            <Typography variant='h4' component='h1'>
              Crea tu cuenta de paciente
            </Typography>
            <Typography className='mbs-1'>Para reservar citas, ver tu expediente y tus recetas desde cualquier lugar.</Typography>
          </div>
          <RegisterForm />
          <div className='flex justify-center items-center flex-wrap gap-2'>
            <Typography>¿Ya tienes una cuenta?</Typography>
            <Typography component={Link} href='/login' color='primary.main'>
              Inicia sesión
            </Typography>
          </div>
        </div>
      </main>
    </div>
  );
};

export default RegisterView;
