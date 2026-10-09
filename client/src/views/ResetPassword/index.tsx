'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import { PasswordField } from '@/components/shared/PasswordField';
import { api } from '@/libs/axios';
import AuthLayout from '@/views/auth/AuthLayout';

const resetPasswordSchema = z
  .object({
    newPassword: z
      .string()
      .min(8, 'La contraseña debe tener al menos 8 caracteres'),
    confirmPassword: z.string().min(1, 'Confirma tu contraseña'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  });

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

const ResetPasswordView = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const { control, handleSubmit } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { newPassword: '', confirmPassword: '' },
  });

  const onSubmit = async (data: ResetPasswordFormValues) => {
    if (!token) {
      setError('Token no encontrado. Solicita un nuevo enlace de recuperación.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await api.post('/auth/reset-password', {
        token,
        newPassword: data.newPassword,
      });
      setSuccess(true);
      setTimeout(() => router.push('/login'), 3000);
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { message?: string } } };
      const message =
        axiosError?.response?.data?.message ||
        'Ocurrió un error. El enlace puede haber expirado.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const backToLogin = (
    <Typography className="flex justify-center items-center" color="primary.main">
      <Link href="/login" className="flex items-center">
        <i className="ri-arrow-left-s-line" aria-hidden="true" />
        <span>Volver al inicio de sesión</span>
      </Link>
    </Typography>
  );

  if (!token) {
    return (
      <AuthLayout
        illustration="reset-password"
        title="Enlace inválido"
        subtitle="No se encontró un token de recuperación. El enlace puede haber expirado o ser incorrecto."
      >
        <Button component={Link} href="/forgot-password" variant="contained" fullWidth>
          Solicitar nuevo enlace
        </Button>
        {backToLogin}
      </AuthLayout>
    );
  }

  if (success) {
    return (
      <AuthLayout
        illustration="reset-password"
        title="Contraseña restablecida"
        subtitle="Tu contraseña se actualizó correctamente. Serás redirigido al inicio de sesión..."
      >
        <Button component={Link} href="/login" variant="contained" fullWidth>
          Ir al inicio de sesión
        </Button>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      illustration="reset-password"
      title="Nueva contraseña 🔒"
      subtitle="Ingresa tu nueva contraseña para restablecer el acceso"
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
        {error && (
          <Alert severity="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        <Alert severity="info" icon={<i className="ri-lock-line" />}>
          La contraseña debe tener al menos 8 caracteres.
        </Alert>
        <Controller
          name="newPassword"
          control={control}
          render={({ field, fieldState: { error: fieldError } }) => (
            <PasswordField
              fullWidth
              {...field}
              label="Nueva contraseña"
              autoComplete="new-password"
              autoFocus
              error={!!fieldError}
              helperText={fieldError?.message}
            />
          )}
        />
        <Controller
          name="confirmPassword"
          control={control}
          render={({ field, fieldState: { error: fieldError } }) => (
            <PasswordField
              fullWidth
              {...field}
              label="Confirmar contraseña"
              autoComplete="new-password"
              error={!!fieldError}
              helperText={fieldError?.message}
            />
          )}
        />
        <Button fullWidth type="submit" variant="contained" disabled={isLoading}>
          {isLoading ? <CircularProgress size={24} color="inherit" aria-label="Procesando" /> : 'Restablecer contraseña'}
        </Button>
      </form>
      {backToLogin}
    </AuthLayout>
  );
};

export default ResetPasswordView;
