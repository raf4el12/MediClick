'use client';

import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import Stepper from '@mui/material/Stepper';
import Typography from '@mui/material/Typography';
import StepperWrapper from '@core/styles/stepper';
import StepperCustomDot from '@/components/stepper-dot';
import { authService } from '@/services/auth.service';
import { useAppDispatch, useAppSelector } from '@/redux-store/hooks';
import { clearError, selectAuthError, selectAuthLoading, selectIsAuthenticated, selectUser } from '@/redux-store/slices/auth';
import { registerThunk } from '@/redux-store/thunks/auth.thunks';
import { REGISTER_STEPS, registerSchema, type RegisterFormValues } from './functions/register.schema';
import StepCredentials from './steps/StepCredentials';
import StepIdentification from './steps/StepIdentification';
import StepMedicalInfo from './steps/StepMedicalInfo';
import StepPersonalData from './steps/StepPersonalData';

const STEP_HINTS = [
  'Ingresa tu documento de identidad. Si es un DNI, completamos tus datos con RENIEC.',
  'Usaremos tu correo para enviarte las confirmaciones de tus citas.',
  'Esta información es necesaria para tu atención médica.',
  'Crea una contraseña segura: mínimo 8 caracteres, con mayúscula, minúscula y número.',
];

/** Registro del paciente en cuatro pasos (layout `register-multi-steps` de Materio). */
export function RegisterForm() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const isLoading = useAppSelector(selectAuthLoading);
  const error = useAppSelector(selectAuthError);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const user = useAppSelector(selectUser);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const [activeStep, setActiveStep] = useState(0);
  const [checking, setChecking] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);

  const { control, handleSubmit, trigger, getValues, setValue, setError } = useForm<RegisterFormValues>({
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
      emergencyContact: '',
      bloodType: '',
      allergies: '',
      chronicConditions: '',
      password: '',
      confirmPassword: '',
    },
    mode: 'onTouched',
  });

  useEffect(() => {
    if (isAuthenticated && user) router.push(user.role === 'PATIENT' ? '/patient' : '/dashboard');
  }, [isAuthenticated, user, router]);

  useEffect(
    () => () => {
      dispatch(clearError());
    },
    [dispatch],
  );

  const goTo = (step: number) => {
    setActiveStep(step);
    // Lleva el foco al título del paso para que el lector de pantalla anuncie el cambio.
    requestAnimationFrame(() => headingRef.current?.focus());
  };

  const validateIdentification = async () => {
    if (!(await trigger(REGISTER_STEPS[0]!.fields))) return false;
    setChecking(true);
    try {
      const { typeDocument, numberDocument } = getValues();
      const { available } = await authService.checkDocument(typeDocument, numberDocument);
      if (!available) {
        setError('numberDocument', { type: 'server', message: 'Este documento ya está registrado' });
        return false;
      }
      // Autocompletar con RENIEC; si la consulta falla, el paciente escribe sus datos.
      if (typeDocument === 'DNI' && /^\d{8}$/.test(numberDocument)) {
        setLookingUp(true);
        try {
          const result = await authService.lookupDocument(typeDocument, numberDocument);
          if (result.found) {
            if (result.name) setValue('name', result.name);
            if (result.lastName) setValue('lastName', result.lastName);
            if (result.birthday) setValue('birthday', result.birthday);
            if (result.gender) setValue('gender', result.gender);
          }
        } catch {
          // Sin autocompletado.
        } finally {
          setLookingUp(false);
        }
      }
      return true;
    } catch {
      setError('numberDocument', { type: 'server', message: 'No se pudo verificar el documento. Intenta de nuevo.' });
      return false;
    } finally {
      setChecking(false);
    }
  };

  const validatePersonalData = async () => {
    if (!(await trigger(REGISTER_STEPS[1]!.fields))) return false;
    setChecking(true);
    try {
      const { available } = await authService.checkEmail(getValues('email'));
      if (!available) {
        setError('email', { type: 'server', message: 'Este email ya está registrado' });
        return false;
      }
      return true;
    } catch {
      setError('email', { type: 'server', message: 'No se pudo verificar el email. Intenta de nuevo.' });
      return false;
    } finally {
      setChecking(false);
    }
  };

  const handleNext = async () => {
    const ok =
      activeStep === 0 ? await validateIdentification() : activeStep === 1 ? await validatePersonalData() : await trigger(REGISTER_STEPS[activeStep]!.fields);
    if (ok) goTo(activeStep + 1);
  };

  const onSubmit = (values: RegisterFormValues) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- la confirmación no viaja al servidor
    const { confirmPassword, ...payload } = values;
    void dispatch(registerThunk(payload));
  };

  const busy = checking || lookingUp || isLoading;
  const last = activeStep === REGISTER_STEPS.length - 1;
  const current = REGISTER_STEPS[activeStep]!;

  return (
    <StepperWrapper className='flex flex-col gap-6'>
      <Stepper activeStep={activeStep} aria-label='Pasos del registro'>
        {REGISTER_STEPS.map((step, index) => (
          <Step key={step.title}>
            <StepLabel slots={{ stepIcon: StepperCustomDot }}>
              <div className='step-label'>
                <Typography className='step-number' color='text.primary'>{`0${index + 1}`}</Typography>
                <div>
                  <Typography className='step-title' color='text.primary'>
                    {step.title}
                  </Typography>
                  <Typography className='step-subtitle'>{step.subtitle}</Typography>
                </div>
              </div>
            </StepLabel>
          </Step>
        ))}
      </Stepper>

      <form noValidate onSubmit={handleSubmit(onSubmit)} className='flex flex-col gap-5'>
        <div>
          <Typography ref={headingRef} tabIndex={-1} variant='h5' component='h2' className='outline-none'>
            Paso {activeStep + 1} de {REGISTER_STEPS.length}: {current.title}
          </Typography>
          <Typography color='text.secondary'>{STEP_HINTS[activeStep]}</Typography>
        </div>

        {error && (
          <Alert severity='error' onClose={() => dispatch(clearError())}>
            {error}
          </Alert>
        )}

        {activeStep === 0 && <StepIdentification control={control} />}
        {activeStep === 1 && <StepPersonalData control={control} />}
        {activeStep === 2 && <StepMedicalInfo control={control} />}
        {activeStep === 3 && <StepCredentials control={control} />}

        <div className='flex flex-wrap justify-between gap-4'>
          <Button variant='outlined' disabled={activeStep === 0 || busy} onClick={() => goTo(activeStep - 1)} startIcon={<i className='ri-arrow-left-line' aria-hidden />}>
            Atrás
          </Button>
          {last ? (
            <Button type='submit' variant='contained' disabled={busy} endIcon={isLoading ? <CircularProgress size={18} color='inherit' /> : <i className='ri-check-line' aria-hidden />}>
              Crear cuenta
            </Button>
          ) : (
            <Button
              variant='contained'
              disabled={busy}
              onClick={() => void handleNext()}
              endIcon={checking || lookingUp ? <CircularProgress size={18} color='inherit' /> : <i className='ri-arrow-right-line' aria-hidden />}
            >
              Siguiente
            </Button>
          )}
        </div>
      </form>
    </StepperWrapper>
  );
}
