'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
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
import { PasswordField } from '@/components/shared/PasswordField';
import { api } from '@/libs/axios';

/* ─── Schemas ─── */
const emailSchema = z.object({
  email: z
    .string()
    .min(1, 'El email es obligatorio')
    .email('Formato de email inválido'),
});

const codeSchema = z.object({
  code: z
    .string()
    .min(1, 'El código es obligatorio')
    .length(6, 'El código debe tener 6 dígitos')
    .regex(/^\d{6}$/, 'El código debe ser numérico'),
});

const passwordSchema = z
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

type EmailForm = z.infer<typeof emailSchema>;
type CodeForm = z.infer<typeof codeSchema>;
type PasswordForm = z.infer<typeof passwordSchema>;

type Step = 'email' | 'code' | 'password' | 'success';

const ForgotPasswordView = () => {
  const theme = useTheme();
  const router = useRouter();
  const [step, setStep] = useState<Step>('email');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const emailRef = useRef('');
  const resetTokenRef = useRef('');

  /* ─── Forms ─── */
  const emailForm = useForm<EmailForm>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: '' },
  });

  const codeForm = useForm<CodeForm>({
    resolver: zodResolver(codeSchema),
    defaultValues: { code: '' },
  });

  const passwordForm = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { newPassword: '', confirmPassword: '' },
  });

  /* ─── Step 1: Send code ─── */
  const onSubmitEmail = async (data: EmailForm) => {
    setIsLoading(true);
    setError(null);
    try {
      await api.post('/auth/forgot-password', { email: data.email });
      emailRef.current = data.email;
      setStep('code');
    } catch {
      setError('Ocurrió un error al procesar tu solicitud. Intenta nuevamente.');
    } finally {
      setIsLoading(false);
    }
  };

  /* ─── Step 2: Verify code ─── */
  const onSubmitCode = async (data: CodeForm) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.post<{ resetToken: string }>('/auth/verify-reset-code', {
        email: emailRef.current,
        code: data.code,
      });
      resetTokenRef.current = res.data.resetToken;
      setStep('password');
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { message?: string } } };
      setError(axiosError?.response?.data?.message || 'Código inválido o expirado');
    } finally {
      setIsLoading(false);
    }
  };

  /* ─── Step 3: Reset password ─── */
  const onSubmitPassword = async (data: PasswordForm) => {
    setIsLoading(true);
    setError(null);
    try {
      await api.post('/auth/reset-password', {
        token: resetTokenRef.current,
        newPassword: data.newPassword,
      });
      setStep('success');
      setTimeout(() => router.push('/login'), 3000);
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { message?: string } } };
      setError(axiosError?.response?.data?.message || 'Ocurrió un error. Intenta nuevamente.');
    } finally {
      setIsLoading(false);
    }
  };

  /* ─── Resend code ─── */
  const handleResendCode = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await api.post('/auth/forgot-password', { email: emailRef.current });
      setError(null);
      codeForm.reset();
    } catch {
      setError('No se pudo reenviar el código.');
    } finally {
      setIsLoading(false);
    }
  };

  /* ─── Step config ─── */
  const stepConfig: Record<Step, { icon: string; iconColor: string; title: string; subtitle: string }> = {
    email: {
      icon: 'ri-lock-unlock-line',
      iconColor: theme.palette.warning.main,
      title: '¿Olvidaste tu contraseña?',
      subtitle: 'Ingresa tu email y te enviaremos un código de verificación',
    },
    code: {
      icon: 'ri-mail-check-line',
      iconColor: theme.palette.info.main,
      title: 'Verificar código',
      subtitle: `Ingresa el código de 6 dígitos enviado a ${emailRef.current}`,
    },
    password: {
      icon: 'ri-key-2-line',
      iconColor: theme.palette.primary.main,
      title: 'Nueva contraseña',
      subtitle: 'Ingresa tu nueva contraseña para restablecer el acceso',
    },
    success: {
      icon: 'ri-checkbox-circle-line',
      iconColor: theme.palette.success.main,
      title: 'Contraseña restablecida',
      subtitle: 'Tu contraseña se actualizó correctamente. Serás redirigido al inicio de sesión...',
    },
  };

  const current = stepConfig[step];

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex' }}>
      {/* Left panel - Hero */}
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
                <i className="ri-heart-pulse-line" style={{ fontSize: 28, color: '#fff' }} />
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 700, letterSpacing: '-0.5px' }}>
                MediClick
              </Typography>
            </Box>
            <Typography variant="h3" sx={{ fontWeight: 700, mb: 2, lineHeight: 1.2 }}>
              Recupera el acceso a tu cuenta
            </Typography>
            <Typography variant="body1" sx={{ opacity: 0.85, lineHeight: 1.7 }}>
              Te enviaremos un código de verificación a tu correo para que puedas restablecer tu contraseña de forma segura.
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Right panel */}
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
            href={step === 'email' ? '/login' : '#'}
            onClick={(e) => {
              if (step === 'code') {
                e.preventDefault();
                setStep('email');
                setError(null);
              } else if (step === 'password') {
                e.preventDefault();
                setStep('code');
                setError(null);
              }
            }}
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

        {/* Content centered */}
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            px: { xs: 3, sm: 6 },
          }}
        >
          <Paper elevation={0} sx={{ width: '100%', maxWidth: 420, p: { xs: 3, sm: 5 } }}>
            {/* Header */}
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
                <i className="ri-heart-pulse-line" style={{ fontSize: 28, color: '#fff' }} />
              </Box>
              <Box
                sx={{
                  width: 56,
                  height: 56,
                  borderRadius: 3.5,
                  bgcolor: alpha(current.iconColor, 0.12),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mx: 'auto',
                  mb: 2,
                }}
              >
                <i className={current.icon} style={{ fontSize: 28, color: current.iconColor }} />
              </Box>
              <Typography variant="h5" fontWeight={700} gutterBottom>
                {current.title}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {current.subtitle}
              </Typography>
            </Box>

            {/* ── Step: email ── */}
            {step === 'email' && (
              <Box
                component="form"
                onSubmit={emailForm.handleSubmit(onSubmitEmail)}
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
                  control={emailForm.control}
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
                  {isLoading ? <CircularProgress size={24} color="inherit" /> : 'Enviar código de verificación'}
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

            {/* ── Step: code ── */}
            {step === 'code' && (
              <Box
                component="form"
                onSubmit={codeForm.handleSubmit(onSubmitCode)}
                noValidate
                sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}
              >
                {error && (
                  <Alert severity="error" onClose={() => setError(null)}>
                    {error}
                  </Alert>
                )}
                <Controller
                  name="code"
                  control={codeForm.control}
                  render={({ field, fieldState: { error: fieldError } }) => (
                    <TextField
                      {...field}
                      label="Código de verificación"
                      autoFocus
                      placeholder="000000"
                      error={!!fieldError}
                      helperText={fieldError?.message}
                      slotProps={{
                        input: {
                          startAdornment: (
                            <Box sx={{ mr: 1, display: 'flex', color: 'action.active' }}>
                              <i className="ri-shield-keyhole-line" style={{ fontSize: 20 }} />
                            </Box>
                          ),
                        },
                        htmlInput: {
                          maxLength: 6,
                          inputMode: 'numeric',
                          style: { letterSpacing: '0.3em', fontWeight: 600, fontSize: '1.1rem' },
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
                  {isLoading ? <CircularProgress size={24} color="inherit" /> : 'Verificar código'}
                </Button>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    ¿No recibiste el código?{' '}
                    <Typography
                      component="span"
                      variant="body2"
                      color="primary"
                      fontWeight={600}
                      sx={{ cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
                      onClick={handleResendCode}
                    >
                      Reenviar código
                    </Typography>
                  </Typography>
                </Box>
              </Box>
            )}

            {/* ── Step: password ── */}
            {step === 'password' && (
              <Box
                component="form"
                onSubmit={passwordForm.handleSubmit(onSubmitPassword)}
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
                  <Typography
                    variant="body2"
                    color="warning.main"
                    sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                  >
                    <i className="ri-lock-line" style={{ fontSize: 18 }} />
                    La contraseña debe tener al menos 8 caracteres.
                  </Typography>
                </Box>
                <Controller
                  name="newPassword"
                  control={passwordForm.control}
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
                  control={passwordForm.control}
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
                  {isLoading ? <CircularProgress size={24} color="inherit" /> : 'Restablecer contraseña'}
                </Button>
              </Box>
            )}

            {/* ── Step: success ── */}
            {step === 'success' && (
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
                  <i
                    className="ri-checkbox-circle-line"
                    style={{ fontSize: 32, color: theme.palette.success.main }}
                  />
                </Box>
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
            )}
          </Paper>
        </Box>
      </Box>
    </Box>
  );
};

export default ForgotPasswordView;
