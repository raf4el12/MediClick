'use client';

import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import { PasswordField } from '@/components/shared/PasswordField';
import { useAppDispatch, useAppSelector } from '@/redux-store/hooks';
import {
  selectAuthLoading,
  selectAuthError,
  selectIsAuthenticated,
  clearError,
} from '@/redux-store/slices/auth';
import { loginThunk } from '@/redux-store/thunks/auth.thunks';

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

  const { control, handleSubmit } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    return () => {
      dispatch(clearError());
    };
  }, [dispatch]);

  const onSubmit = (data: LoginFormValues) => {
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
