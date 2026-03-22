'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import { useTheme, alpha } from '@mui/material/styles';
import { api } from '@/libs/axios';

const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, 'El email es obligatorio')
    .email('Formato de email inválido'),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

const ForgotPasswordView = () => {
  const theme = useTheme();
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
      }}
    >
      {/* Left panel - Hero image */}
      <Box
        sx={{
          display: { xs: 'none', md: 'flex' },
          flex: 1,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Image
          src="/images/login-hero.jpg"
          alt=""
          fill
          style={{ objectFit: 'cover' }}
          priority
          unoptimized={true}
        />
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            background: `linear-gradient(135deg, ${alpha(theme.palette.primary.dark, 0.75)} 0%, ${alpha(theme.palette.primary.main, 0.55)} 50%, ${alpha('#000', 0.45)} 100%)`,
          }}
        />

        <Box
          sx={{
            position: 'relative',
            zIndex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            flex: 1,
            p: 6,
            color: 'common.white',
          }}
        >
          <Box sx={{ maxWidth: 480 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 6 }}>
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: 3,
                  bgcolor: alpha(theme.palette.common.white, 0.2),
                  backdropFilter: 'blur(8px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <i
                  className="ri-heart-pulse-line"
                  style={{ fontSize: 28, color: '#fff' }}
                />
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 700, letterSpacing: '-0.5px' }}>
                MediClick
              </Typography>
            </Box>

            <Typography variant="h3" sx={{ fontWeight: 700, mb: 2, lineHeight: 1.2 }}>
              Recupera el acceso a tu cuenta
            </Typography>
            <Typography
              variant="body1"
              sx={{ opacity: 0.85, lineHeight: 1.7 }}
            >
              No te preocupes, te enviaremos un enlace seguro a tu correo
              para que puedas restablecer tu contraseña en minutos.
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Right panel - Form */}
      <Box
        sx={{
          flex: { xs: 1, md: '0 0 520px' },
          display: 'flex',
          flexDirection: 'column',
          bgcolor: 'background.paper',
          position: 'relative',
        }}
      >
        {/* Back button */}
        <Box sx={{ p: 2 }}>
          <IconButton
            component={Link}
            href="/login"
            sx={{
              color: 'text.secondary',
              '&:hover': {
                bgcolor: alpha(theme.palette.primary.main, 0.08),
                color: 'primary.main',
              },
            }}
          >
            <i className="ri-arrow-left-line" style={{ fontSize: 22 }} />
          </IconButton>
        </Box>

        {/* Form centered */}
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            px: { xs: 3, sm: 6 },
          }}
        >
          <Paper
            elevation={0}
            sx={{
              width: '100%',
              maxWidth: 420,
              p: { xs: 3, sm: 5 },
            }}
          >
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <Box
                sx={{
                  width: 56,
                  height: 56,
                  borderRadius: 3.5,
                  bgcolor: 'primary.main',
                  display: { xs: 'flex', md: 'none' },
                  alignItems: 'center',
                  justifyContent: 'center',
                  mx: 'auto',
                  mb: 2,
                }}
              >
                <i
                  className="ri-heart-pulse-line"
                  style={{ fontSize: 28, color: '#fff' }}
                />
              </Box>
              <Box
                sx={{
                  width: 56,
                  height: 56,
                  borderRadius: 3.5,
                  bgcolor: alpha(theme.palette.warning.main, 0.12),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mx: 'auto',
                  mb: 2,
                }}
              >
                <i className="ri-lock-unlock-line" style={{ fontSize: 28, color: theme.palette.warning.main }} />
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
                <Box
                  sx={{
                    width: 64,
                    height: 64,
                    borderRadius: '50%',
                    bgcolor: alpha(theme.palette.success.main, 0.12),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mx: 'auto',
                    mb: 3,
                  }}
                >
                  <i className="ri-mail-check-line" style={{ fontSize: 32, color: theme.palette.success.main }} />
                </Box>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  Revisa tu bandeja de entrada
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Si el email está registrado, recibirás un enlace para restablecer tu contraseña.
                </Typography>
                <Button
                  component={Link}
                  href="/login"
                  variant="contained"
                  size="large"
                  fullWidth
                  sx={{ py: 1.5 }}
                >
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
                  <Typography variant="body2" color="text.secondary">
                    ¿Recordaste tu contraseña?{' '}
                    <Typography
                      component={Link}
                      href="/login"
                      variant="body2"
                      color="primary"
                      fontWeight={600}
                      sx={{ textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                    >
                      Iniciar Sesión
                    </Typography>
                  </Typography>
                </Box>
              </Box>
            )}
          </Paper>
        </Box>
      </Box>
    </Box>
  );
};

export default ForgotPasswordView;
