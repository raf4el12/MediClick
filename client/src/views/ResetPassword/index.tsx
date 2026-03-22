'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import { useTheme, alpha, type Theme } from '@mui/material/styles';
import { PasswordField } from '@/components/shared/PasswordField';
import { api } from '@/libs/axios';

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

/* ─── Shared left panel ─── */
function HeroPanel({ theme }: { theme: Theme }) {
  return (
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
            Restablece tu contraseña
          </Typography>
          <Typography
            variant="body1"
            sx={{ opacity: 0.85, lineHeight: 1.7 }}
          >
            Crea una nueva contraseña segura para recuperar el acceso
            a tu cuenta y continuar gestionando tus citas médicas.
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}

const ResetPasswordView = () => {
  const theme = useTheme();
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

  /* ─── No token state ─── */
  if (!token) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex' }}>
        <HeroPanel theme={theme} />

        <Box
          sx={{
            flex: { xs: 1, md: '0 0 520px' },
            display: 'flex',
            flexDirection: 'column',
            bgcolor: 'background.paper',
            position: 'relative',
          }}
        >
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

          <Box
            sx={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              px: { xs: 3, sm: 6 },
            }}
          >
            <Paper elevation={0} sx={{ width: '100%', maxWidth: 420, p: { xs: 3, sm: 5 }, textAlign: 'center' }}>
              <Box
                sx={{
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  bgcolor: alpha(theme.palette.error.main, 0.12),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mx: 'auto',
                  mb: 3,
                }}
              >
                <i className="ri-link-unlink" style={{ fontSize: 32, color: theme.palette.error.main }} />
              </Box>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Enlace inválido
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                No se encontró un token de recuperación. El enlace puede haber expirado o ser incorrecto.
              </Typography>
              <Button
                component={Link}
                href="/forgot-password"
                variant="contained"
                size="large"
                fullWidth
                sx={{ py: 1.5 }}
              >
                Solicitar nuevo enlace
              </Button>
            </Paper>
          </Box>
        </Box>
      </Box>
    );
  }

  /* ─── Main form ─── */
  return (
    <Box sx={{ minHeight: '100vh', display: 'flex' }}>
      <HeroPanel theme={theme} />

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
                  bgcolor: alpha(theme.palette.primary.main, 0.12),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mx: 'auto',
                  mb: 2,
                }}
              >
                <i className="ri-key-2-line" style={{ fontSize: 28, color: theme.palette.primary.main }} />
              </Box>
              <Typography variant="h5" fontWeight={700} gutterBottom>
                Nueva contraseña
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Ingresa tu nueva contraseña para restablecer el acceso
              </Typography>
            </Box>

            {success ? (
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
                  <i className="ri-checkbox-circle-line" style={{ fontSize: 32, color: theme.palette.success.main }} />
                </Box>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  Contraseña restablecida
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Tu contraseña se actualizó correctamente. Serás redirigido al inicio de sesión...
                </Typography>
                <Button
                  component={Link}
                  href="/login"
                  variant="contained"
                  size="large"
                  fullWidth
                  sx={{ py: 1.5 }}
                >
                  Ir al inicio de sesión
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

                <Box
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    bgcolor: alpha(theme.palette.warning.main, 0.08),
                    border: `1px solid ${alpha(theme.palette.warning.main, 0.2)}`,
                  }}
                >
                  <Typography variant="body2" color="warning.main" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <i className="ri-lock-line" style={{ fontSize: 18 }} />
                    La contraseña debe tener al menos 8 caracteres.
                  </Typography>
                </Box>

                <Controller
                  name="newPassword"
                  control={control}
                  render={({ field, fieldState: { error: fieldError } }) => (
                    <PasswordField
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
                      {...field}
                      label="Confirmar contraseña"
                      autoComplete="new-password"
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
                    'Restablecer contraseña'
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

export default ResetPasswordView;
