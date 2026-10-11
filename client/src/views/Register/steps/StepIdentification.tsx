'use client';

import { Controller, type Control } from 'react-hook-form';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import { DOCUMENT_TYPES, type RegisterFormValues } from '../functions/register.schema';

export default function StepIdentification({ control }: { control: Control<RegisterFormValues> }) {
  return (
    <div className='grid gap-5 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]'>
      <Controller
        name='typeDocument'
        control={control}
        render={({ field, fieldState: { error } }) => (
          <TextField {...field} id='registro-tipo-documento' select fullWidth label='Tipo de documento' error={!!error} helperText={error?.message}>
            {DOCUMENT_TYPES.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </TextField>
        )}
      />
      <Controller
        name='numberDocument'
        control={control}
        render={({ field, fieldState: { error } }) => (
          <TextField {...field} id='registro-numero-documento' fullWidth label='Número de documento' autoComplete='off' error={!!error} helperText={error?.message} />
        )}
      />
    </div>
  );
}
