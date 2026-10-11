'use client';

import { Controller, type Control } from 'react-hook-form';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import { InternationalPhoneInput } from '@/components/shared/InternationalPhoneInput';
import { GENDER_OPTIONS, type RegisterFormValues } from '../functions/register.schema';

export default function StepPersonalData({ control }: { control: Control<RegisterFormValues> }) {
  return (
    <div className='grid gap-5 sm:grid-cols-2'>
      <Controller
        name='name'
        control={control}
        render={({ field, fieldState: { error } }) => (
          <TextField {...field} id='registro-nombres' fullWidth label='Nombres' autoComplete='given-name' error={!!error} helperText={error?.message} />
        )}
      />
      <Controller
        name='lastName'
        control={control}
        render={({ field, fieldState: { error } }) => (
          <TextField {...field} id='registro-apellidos' fullWidth label='Apellidos' autoComplete='family-name' error={!!error} helperText={error?.message} />
        )}
      />
      <Controller
        name='email'
        control={control}
        render={({ field, fieldState: { error } }) => (
          <TextField
            {...field}
            id='registro-email'
            fullWidth
            type='email'
            label='Correo electrónico'
            autoComplete='email'
            error={!!error}
            helperText={error?.message}
            className='sm:col-span-2'
          />
        )}
      />
      <Controller
        name='phone'
        control={control}
        render={({ field, fieldState: { error } }) => (
          <InternationalPhoneInput value={field.value} onChange={(val) => field.onChange(val ?? '')} error={error?.message} label='Celular' />
        )}
      />
      <Controller
        name='birthday'
        control={control}
        render={({ field, fieldState: { error } }) => (
          <TextField
            {...field}
            id='registro-nacimiento'
            fullWidth
            type='date'
            label='Fecha de nacimiento'
            autoComplete='bday'
            error={!!error}
            helperText={error?.message}
            slotProps={{ inputLabel: { shrink: true } }}
          />
        )}
      />
      <Controller
        name='gender'
        control={control}
        render={({ field, fieldState: { error } }) => (
          <TextField {...field} id='registro-genero' select fullWidth label='Género (opcional)' error={!!error} helperText={error?.message}>
            <MenuItem value=''>No especificar</MenuItem>
            {GENDER_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </TextField>
        )}
      />
    </div>
  );
}
