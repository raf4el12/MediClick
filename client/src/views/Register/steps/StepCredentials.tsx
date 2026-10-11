'use client';

import { Controller, type Control } from 'react-hook-form';
import { PasswordField } from '@/components/shared/PasswordField';
import type { RegisterFormValues } from '../functions/register.schema';

export default function StepCredentials({ control }: { control: Control<RegisterFormValues> }) {
  return (
    <div className='grid gap-5 sm:grid-cols-2'>
      <Controller
        name='password'
        control={control}
        render={({ field, fieldState: { error } }) => (
          <PasswordField {...field} id='registro-contrasena' fullWidth label='Contraseña' autoComplete='new-password' error={!!error} helperText={error?.message} />
        )}
      />
      <Controller
        name='confirmPassword'
        control={control}
        render={({ field, fieldState: { error } }) => (
          <PasswordField
            {...field}
            id='registro-confirmar'
            fullWidth
            label='Confirmar contraseña'
            autoComplete='new-password'
            error={!!error}
            helperText={error?.message}
          />
        )}
      />
    </div>
  );
}
