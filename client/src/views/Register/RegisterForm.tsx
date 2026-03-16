'use client';

import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import MenuItem from '@mui/material/MenuItem';
import Stepper from '@mui/material/Stepper';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import { alpha } from '@mui/material/styles';
import { PasswordField } from '@/components/shared/PasswordField';
import { authService } from '@/services/auth.service';
import { useAppDispatch, useAppSelector } from '@/redux-store/hooks';
import {
  selectAuthLoading,
  selectAuthError,
  selectIsAuthenticated,
  selectUser,
  clearError,
} from '@/redux-store/slices/auth';
import { registerThunk } from '@/redux-store/thunks/auth.thunks';
import { UserRole } from '@/types/auth.types';

const DOCUMENT_TYPES = [
  { value: 'DNI', label: 'DNI' },
  { value: 'CE', label: 'Carné de Extranjería' },
  { value: 'PASAPORTE', label: 'Pasaporte' },
];

const GENDER_OPTIONS = [
  { value: 'M', label: 'Masculino' },
  { value: 'F', label: 'Femenino' },
];

const STEPS = ['Identificación', 'Datos Personales', 'Credenciales'];

const registerSchema = z
  .object({
    typeDocument: z.string().min(1, 'Selecciona un tipo de documento'),
    numberDocument: z
      .string()
      .min(1, 'El número de documento es obligatorio')
      .max(20, 'Máximo 20 caracteres'),
    name: z
      .string()
      .min(1, 'El nombre es obligatorio')
      .max(100, 'Máximo 100 caracteres'),
    lastName: z
      .string()
      .min(1, 'El apellido es obligatorio')
      .max(100, 'Máximo 100 caracteres'),
    email: z
      .string()
      .min(1, 'El email es obligatorio')
      .email('Formato de email inválido'),
    phone: z
      .string()
      .min(1, 'El teléfono es obligatorio')
      .regex(/^9\d{8}$/, 'Debe ser un celular válido (9 dígitos, inicia con 9)'),
    birthday: z.string().optional(),
    gender: z.string().optional(),
    password: z
      .string()
      .min(6, 'La contraseña debe tener al menos 6 caracteres'),
    confirmPassword: z.string().min(1, 'Confirma tu contraseña'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

const STEP_FIELDS: (keyof RegisterFormValues)[][] = [
  ['typeDocument', 'numberDocument'],
  ['name', 'lastName', 'email', 'phone', 'birthday', 'gender'],
  ['password', 'confirmPassword'],
];

export function RegisterForm() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const isLoading = useAppSelector(selectAuthLoading);
  const error = useAppSelector(selectAuthError);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const user = useAppSelector(selectUser);

  const [activeStep, setActiveStep] = useState(0);
  const [checking, setChecking] = useState(false);

  const {
    control,
    handleSubmit,
    trigger,
    getValues,
    setError,
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      typeDocument: 'DNI',
      numberDocument: '',
      name: '',
      lastName: '',
      email: '',
      phone: '',
      birthday: '',
      gender: '',
      password: '',
      confirmPassword: '',
    },
    mode: 'onTouched',
  });

  useEffect(() => {
    if (isAuthenticated && user) {
      const target = user.role === UserRole.PATIENT ? '/patient' : '/dashboard';
      router.push(target);
    }
  }, [isAuthenticated, user, router]);

  useEffect(() => {
    return () => {
      dispatch(clearError());
    };
  }, [dispatch]);

  const validateStep0 = async (): Promise<boolean> => {
    const fieldsValid = await trigger(STEP_FIELDS[0]);
    if (!fieldsValid) return false;

    setChecking(true);
    try {
      const { typeDocument, numberDocument } = getValues();
      const { available } = await authService.checkDocument(typeDocument, numberDocument);
      if (!available) {
        setError('numberDocument', {
          type: 'server',
          message: 'Este documento ya está registrado',
        });
        return false;
      }
      return true;
    } catch {
      setError('numberDocument', {
        type: 'server',
        message: 'No se pudo verificar el documento. Intenta de nuevo.',
      });
      return false;
    } finally {
      setChecking(false);
    }
  };

  const validateStep1 = async (): Promise<boolean> => {
    const fieldsValid = await trigger(STEP_FIELDS[1]);
    if (!fieldsValid) return false;

    setChecking(true);
    try {
      const { email } = getValues();
      const { available } = await authService.checkEmail(email);
      if (!available) {
        setError('email', {
          type: 'server',
          message: 'Este email ya está registrado',
        });
        return false;
      }
      return true;
    } catch {
      setError('email', {
        type: 'server',
        message: 'No se pudo verificar el email. Intenta de nuevo.',
      });
      return false;
    } finally {
      setChecking(false);
    }
  };

  const handleNext = async () => {
    let canProceed = false;
    if (activeStep === 0) {
      canProceed = await validateStep0();
    } else if (activeStep === 1) {
      canProceed = await validateStep1();
    }
    if (canProceed) {
      setActiveStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const onSubmit = (data: RegisterFormValues) => {
    const { confirmPassword, ...payload } = data;
    void dispatch(registerThunk(payload));
  };

  const isStepLoading = checking || isLoading;

  return (
    <Box
      component="form"
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}
    >
      {/* Stepper */}
      <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 1 }}>
        {STEPS.map((label) => (
          <Step key={label}>
            <StepLabel
              slotProps={{
                label: { sx: { fontSize: '0.75rem', mt: 0.5 } },
              }}
            >
              {label}
            </StepLabel>
          </Step>
        ))}
      </Stepper>

      {error && (
        <Alert severity="error" onClose={() => dispatch(clearError())}>
          {error}
        </Alert>
      )}

      {/* ── Step 1: Identificación ── */}
      {activeStep === 0 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          <Box
            sx={{
              p: 2,
              borderRadius: 2,
              bgcolor: (t) => alpha(t.palette.info.main, 0.08),
              border: (t) => `1px solid ${alpha(t.palette.info.main, 0.2)}`,
            }}
          >
            <Typography variant="body2" color="info.main" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <i className="ri-information-line" style={{ fontSize: 18 }} />
              Ingresa tu documento de identidad para comenzar el registro.
            </Typography>
          </Box>

          <Controller
            name="typeDocument"
            control={control}
            render={({ field, fieldState: { error: fieldError } }) => (
              <TextField
                {...field}
                select
                label="Tipo de Documento"
                error={!!fieldError}
                helperText={fieldError?.message}
                slotProps={{
                  input: {
                    startAdornment: (
                      <Box sx={{ mr: 1, display: 'flex', color: 'action.active' }}>
                        <i className="ri-id-card-line" style={{ fontSize: 20 }} />
                      </Box>
                    ),
                  },
                }}
              >
                {DOCUMENT_TYPES.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </TextField>
            )}
          />

          <Controller
            name="numberDocument"
            control={control}
            render={({ field, fieldState: { error: fieldError } }) => (
              <TextField
                {...field}
                label="Número de Documento"
                error={!!fieldError}
                helperText={fieldError?.message}
                slotProps={{
                  input: {
                    startAdornment: (
                      <Box sx={{ mr: 1, display: 'flex', color: 'action.active' }}>
                        <i className="ri-hashtag" style={{ fontSize: 20 }} />
                      </Box>
                    ),
                  },
                }}
              />
            )}
          />
        </Box>
      )}

      {/* ── Step 2: Datos Personales ── */}
      {activeStep === 1 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller
                name="name"
                control={control}
                render={({ field, fieldState: { error: fieldError } }) => (
                  <TextField
                    {...field}
                    label="Nombres"
                    fullWidth
                    error={!!fieldError}
                    helperText={fieldError?.message}
                    slotProps={{
                      input: {
                        startAdornment: (
                          <Box sx={{ mr: 1, display: 'flex', color: 'action.active' }}>
                            <i className="ri-user-line" style={{ fontSize: 20 }} />
                          </Box>
                        ),
                      },
                    }}
                  />
                )}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller
                name="lastName"
                control={control}
                render={({ field, fieldState: { error: fieldError } }) => (
                  <TextField
                    {...field}
                    label="Apellidos"
                    fullWidth
                    error={!!fieldError}
                    helperText={fieldError?.message}
                  />
                )}
              />
            </Grid>
          </Grid>

          <Controller
            name="email"
            control={control}
            render={({ field, fieldState: { error: fieldError } }) => (
              <TextField
                {...field}
                label="Correo Electrónico"
                autoComplete="email"
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

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller
                name="phone"
                control={control}
                render={({ field, fieldState: { error: fieldError } }) => (
                  <TextField
                    {...field}
                    label="Celular"
                    fullWidth
                    error={!!fieldError}
                    helperText={fieldError?.message}
                    slotProps={{
                      input: {
                        startAdornment: (
                          <Box sx={{ mr: 1, display: 'flex', color: 'action.active' }}>
                            <i className="ri-phone-line" style={{ fontSize: 20 }} />
                          </Box>
                        ),
                      },
                    }}
                  />
                )}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller
                name="birthday"
                control={control}
                render={({ field, fieldState: { error: fieldError } }) => (
                  <TextField
                    {...field}
                    label="Fecha de Nacimiento"
                    type="date"
                    fullWidth
                    error={!!fieldError}
                    helperText={fieldError?.message}
                    slotProps={{
                      inputLabel: { shrink: true },
                      input: {
                        startAdornment: (
                          <Box sx={{ mr: 1, display: 'flex', color: 'action.active' }}>
                            <i className="ri-calendar-line" style={{ fontSize: 20 }} />
                          </Box>
                        ),
                      },
                    }}
                  />
                )}
              />
            </Grid>
          </Grid>

          <Controller
            name="gender"
            control={control}
            render={({ field, fieldState: { error: fieldError } }) => (
              <TextField
                {...field}
                select
                label="Género (opcional)"
                error={!!fieldError}
                helperText={fieldError?.message}
                slotProps={{
                  input: {
                    startAdornment: (
                      <Box sx={{ mr: 1, display: 'flex', color: 'action.active' }}>
                        <i className="ri-user-heart-line" style={{ fontSize: 20 }} />
                      </Box>
                    ),
                  },
                }}
              >
                <MenuItem value="">No especificar</MenuItem>
                {GENDER_OPTIONS.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </TextField>
            )}
          />
        </Box>
      )}

      {/* ── Step 3: Credenciales ── */}
      {activeStep === 2 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          <Box
            sx={{
              p: 2,
              borderRadius: 2,
              bgcolor: (t) => alpha(t.palette.warning.main, 0.08),
              border: (t) => `1px solid ${alpha(t.palette.warning.main, 0.2)}`,
            }}
          >
            <Typography variant="body2" color="warning.main" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <i className="ri-lock-line" style={{ fontSize: 18 }} />
              Crea una contraseña segura de al menos 6 caracteres.
            </Typography>
          </Box>

          <Controller
            name="password"
            control={control}
            render={({ field, fieldState: { error: fieldError } }) => (
              <PasswordField
                {...field}
                label="Contraseña"
                autoComplete="new-password"
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
                label="Confirmar Contraseña"
                autoComplete="new-password"
                error={!!fieldError}
                helperText={fieldError?.message}
              />
            )}
          />
        </Box>
      )}

      {/* Navigation buttons */}
      <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
        {activeStep > 0 && (
          <Button
            variant="outlined"
            onClick={handleBack}
            disabled={isStepLoading}
            sx={{ flex: 1, py: 1.5 }}
          >
            Atrás
          </Button>
        )}
        {activeStep < STEPS.length - 1 ? (
          <Button
            variant="contained"
            onClick={handleNext}
            disabled={isStepLoading}
            sx={{ flex: 1, py: 1.5 }}
          >
            {checking ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              'Siguiente'
            )}
          </Button>
        ) : (
          <Button
            type="submit"
            variant="contained"
            disabled={isStepLoading}
            sx={{ flex: 1, py: 1.5 }}
          >
            {isLoading ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              'Crear Cuenta'
            )}
          </Button>
        )}
      </Box>
    </Box>
  );
}
