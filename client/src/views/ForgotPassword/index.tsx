'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import { api } from '@/libs/axios';

const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, 'El email es obligatorio')
    .email('Formato de email inválido'),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

const ForgotPasswordView = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { control, handleSubmit } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (data: ForgotPasswordFormValues) => {
    setIsLoading(true);
    setError(null);

    try {
      await api.post('/auth/forgot-password', { email: data.email });
      setSubmitted(true);
    } catch {
      setError('Ocurrió un error al procesar tu solicitud. Intenta nuevamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        px: 2,
      }}
    >
      <Paper
        elevation={0}
        sx={{
          width: '100%',
          maxWidth: 440,
          p: { xs: 3, sm: 5 },
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 3,
        }}
      >
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: 3.5,
              bgcolor: 'primary.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mx: 'auto',
              mb: 2,
            }}
          >
            <i className="ri-lock-unlock-line" style={{ fontSize: 28, color: '#fff' }} />
          </Box>
          <Typography variant="h5" fontWeight={700} gutterBottom>
            ¿Olvidaste tu contraseña?
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Ingresa tu email y te enviaremos un enlace para restablecerla
          </Typography>
        </Box>

        {submitted ? (
          <Box sx={{ textAlign: 'center' }}>
            <Alert severity="success" sx={{ mb: 3 }}>
              Si el email está registrado, recibirás un enlace para restablecer tu contraseña.
              Revisa tu bandeja de entrada.
            </Alert>
            <Button component={Link} href="/login" variant="outlined" fullWidth>
              Volver al inicio de sesión
            </Button>
          </Box>
        ) : (
          <Box
            component="form"
            onSubmit={handleSubmit(onSubmit)}
            noValidate
            sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}
          >
            {error && (
              <Alert severity="error" onClose={() => setError(null)}>
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
                'Enviar enlace de recuperación'
              )}
            </Button>

            <Box sx={{ textAlign: 'center' }}>
              <Typography
                component={Link}
                href="/login"
                variant="body2"
                color="primary"
                fontWeight={600}
                sx={{ textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
              >
                Volver al inicio de sesión
              </Typography>
            </Box>
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default ForgotPasswordView;
