'use client';

import Link from 'next/link';
import Typography from '@mui/material/Typography';
import AuthLayout from '@/views/auth/AuthLayout';
import { LoginForm } from './LoginForm';

const LoginView = () => (
  <AuthLayout
    illustration='login'
    title='Bienvenido a MediClick 👋🏻'
    subtitle='Ingresa tus credenciales para acceder al sistema'
  >
    <LoginForm />
    <div className='flex justify-center items-center flex-wrap gap-2'>
      <Typography>¿No tienes una cuenta?</Typography>
      <Typography component={Link} href='/register' color='primary.main'>
        Regístrate aquí
      </Typography>
    </div>
  </AuthLayout>
);

export default LoginView;
