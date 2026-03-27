'use client';

import { useEffect, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import Box from '@mui/material/Box';
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
import { UserRole } from '@/types/auth.types';

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
      const defaultTarget = user.role === UserRole.PATIENT ? '/patient' : '/dashboard';
      router.push(from || defaultTarget);
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
    <Box
      component="form"
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}
    >
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
            label="Email"
            autoComplete="email"
            autoFocus
            error={!!fieldError}
            helperText={fieldError?.message}
            slotProps={{
              input: {
                startAdornment: (
                  <Box sx={{ mr: 1, display: 'flex', color: 'action.active' }}>
                    <i className="ri-mail-line" style={{ fontSize: 20 }} />
                  </Box>
                ),
              },
            }}
          />
        )}
      />

      <Controller
        name="password"
        control={control}
        render={({ field, fieldState: { error: fieldError } }) => (
          <PasswordField
            {...field}
            label="Contraseña"
            autoComplete="current-password"
            error={!!fieldError}
            helperText={fieldError?.message}
          />
        )}
      />

      <Box sx={{ textAlign: 'right', mt: -1 }}>
        <Typography
          component={Link}
          href="/forgot-password"
          variant="body2"
          color="primary"
          fontWeight={500}
          sx={{ textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
        >
          ¿Olvidaste tu contraseña?
        </Typography>
      </Box>

      <Button
        type="submit"
        variant="contained"
        size="large"
        disabled={isLoading}
        sx={{ mt: 1, py: 1.5 }}
      >
        {isLoading ? (
          <CircularProgress size={24} color="inherit" />
        ) : (
          'Iniciar Sesión'
        )}
      </Button>
    </Box>
  );
}
