'use client';

import { useEffect, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import { PasswordField } from '@/components/shared/PasswordField';
import { useAppDispatch, useAppSelector } from '@/redux-store/hooks';
import {
  selectAuthLoading,
  selectAuthError,
  selectIsAuthenticated,
  selectUser,
  clearError,
  resetAuth,
} from '@/redux-store/slices/auth';
import { loginThunk } from '@/redux-store/thunks/auth.thunks';
import { actorFor, homePathFor } from '@configs/navigation';

const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'El email es obligatorio')
    .email('Formato de email inválido'),
  password: z
    .string()
    .min(6, 'La contraseña debe tener al menos 6 caracteres'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const isLoading = useAppSelector(selectAuthLoading);
  const error = useAppSelector(selectAuthError);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const user = useAppSelector(selectUser);
  const searchParams = useSearchParams();

  const loginDispatched = useRef(false);

  const { control, handleSubmit } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  // Si estamos en /login es porque el middleware NO encontró cookie válida.
  // Limpiamos estado de Redux que podría estar obsoleto (redux-persist).
  useEffect(() => {
    if (isAuthenticated) {
      dispatch(resetAuth());
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- Intentional: only run on mount to clear stale persisted auth state

  useEffect(() => {
    if (loginDispatched.current && isAuthenticated && user) {
      const from = searchParams.get('from');
      // Solo rutas de la propia app: una URL absoluta, `//host` o `/\host` abrirían una redirección externa.
      const safeFrom = from && /^\/(?![/\\])/.test(from) ? from : null;
      router.push(safeFrom ?? homePathFor(actorFor(user.role)));
    }
  }, [isAuthenticated, user, router, searchParams]);

  useEffect(() => {
    return () => {
      dispatch(clearError());
    };
  }, [dispatch]);

  const onSubmit = (data: LoginFormValues) => {
    loginDispatched.current = true;
    void dispatch(loginThunk(data));
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
      {error && (
        <Alert severity="error" onClose={() => dispatch(clearError())}>
          {error}
        </Alert>
      )}

      <Controller
        name="email"
        control={control}
        render={({ field, fieldState: { error: fieldError } }) => (
          <TextField
            {...field}
            fullWidth
            type="email"
            label="Email"
            autoComplete="email"
            autoFocus
            error={!!fieldError}
            helperText={fieldError?.message}
          />
        )}
      />

      <Controller
        name="password"
        control={control}
        render={({ field, fieldState: { error: fieldError } }) => (
          <PasswordField
            fullWidth
            {...field}
            label="Contraseña"
            autoComplete="current-password"
            error={!!fieldError}
            helperText={fieldError?.message}
          />
        )}
      />

      <Typography className="text-end" color="primary.main" component={Link} href="/forgot-password">
        ¿Olvidaste tu contraseña?
      </Typography>

      <Button fullWidth type="submit" variant="contained" disabled={isLoading}>
        {isLoading ? <CircularProgress size={24} color="inherit" aria-label="Iniciando sesión" /> : 'Iniciar sesión'}
      </Button>
    </form>
  );
}
