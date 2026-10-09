'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import MuiLink from '@mui/material/Link';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import { PasswordField } from '@/components/shared/PasswordField';
import { api } from '@/libs/axios';
import AuthLayout from '@/views/auth/AuthLayout';

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

  const stepConfig: Record<Step, { title: string; subtitle: string }> = {
    email: {
      title: '¿Olvidaste tu contraseña? 🔒',
      subtitle: 'Ingresa tu email y te enviaremos un código de verificación',
    },
    code: {
      title: 'Verificar código',
      subtitle: `Ingresa el código de 6 dígitos enviado a ${emailRef.current}`,
    },
    password: {
      title: 'Nueva contraseña',
      subtitle: 'Ingresa tu nueva contraseña para restablecer el acceso',
    },
    success: {
      title: 'Contraseña restablecida',
      subtitle: 'Tu contraseña se actualizó correctamente. Serás redirigido al inicio de sesión...',
    },
  };

  const current = stepConfig[step];
  const previousStep: Partial<Record<Step, Step>> = { code: 'email', password: 'code' };
  const goBack = previousStep[step];

  const errorAlert = error && (
    <Alert severity="error" onClose={() => setError(null)}>
      {error}
    </Alert>
  );

  const submitLabel = (label: string) =>
    isLoading ? <CircularProgress size={24} color="inherit" aria-label="Procesando" /> : label;

  return (
    <AuthLayout
      illustration={step === 'email' || step === 'code' ? 'forgot-password' : 'reset-password'}
      title={current.title}
      subtitle={current.subtitle}
    >
      {step === 'email' && (
        <form onSubmit={emailForm.handleSubmit(onSubmitEmail)} noValidate className="flex flex-col gap-5">
          {errorAlert}
          <Controller
            name="email"
            control={emailForm.control}
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
          <Button fullWidth type="submit" variant="contained" disabled={isLoading}>
            {submitLabel('Enviar código de verificación')}
          </Button>
        </form>
      )}

      {step === 'code' && (
        <form onSubmit={codeForm.handleSubmit(onSubmitCode)} noValidate className="flex flex-col gap-5">
          {errorAlert}
          <Controller
            name="code"
            control={codeForm.control}
            render={({ field, fieldState: { error: fieldError } }) => (
              <TextField
                {...field}
                fullWidth
                label="Código de verificación"
                autoFocus
                autoComplete="one-time-code"
                placeholder="000000"
                error={!!fieldError}
                helperText={fieldError?.message}
                slotProps={{
                  htmlInput: {
                    maxLength: 6,
                    inputMode: 'numeric',
                    style: { letterSpacing: '0.3em', fontWeight: 600, fontSize: '1.1rem' },
                  },
                }}
              />
            )}
          />
          <Button fullWidth type="submit" variant="contained" disabled={isLoading}>
            {submitLabel('Verificar código')}
          </Button>
          <div className="flex justify-center items-center flex-wrap gap-2">
            <Typography>¿No recibiste el código?</Typography>
            <MuiLink component="button" type="button" onClick={handleResendCode} disabled={isLoading}>
              Reenviar código
            </MuiLink>
          </div>
        </form>
      )}

      {step === 'password' && (
        <form onSubmit={passwordForm.handleSubmit(onSubmitPassword)} noValidate className="flex flex-col gap-5">
          {errorAlert}
          <Alert severity="info" icon={<i className="ri-lock-line" />}>
            La contraseña debe tener al menos 8 caracteres.
          </Alert>
          <Controller
            name="newPassword"
            control={passwordForm.control}
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
            control={passwordForm.control}
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
            {submitLabel('Restablecer contraseña')}
          </Button>
        </form>
      )}

      {step === 'success' && (
        <Button component={Link} href="/login" variant="contained" fullWidth>
          Ir al inicio de sesión
        </Button>
      )}

      {step !== 'success' && (
        <Typography className="flex justify-center items-center" color="primary.main">
          {goBack ? (
            <MuiLink
              component="button"
              type="button"
              className="flex items-center"
              onClick={() => {
                setStep(goBack);
                setError(null);
              }}
            >
              <i className="ri-arrow-left-s-line" aria-hidden="true" />
              <span>Volver al paso anterior</span>
            </MuiLink>
          ) : (
            <Link href="/login" className="flex items-center">
              <i className="ri-arrow-left-s-line" aria-hidden="true" />
              <span>Volver al inicio de sesión</span>
            </Link>
          )}
        </Typography>
      )}
    </AuthLayout>
  );
};

export default ForgotPasswordView;
