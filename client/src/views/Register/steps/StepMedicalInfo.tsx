'use client';

import { Controller, type Control } from 'react-hook-form';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import { InternationalPhoneInput } from '@/components/shared/InternationalPhoneInput';
import { BLOOD_TYPE_OPTIONS, type RegisterFormValues } from '../functions/register.schema';

export default function StepMedicalInfo({ control }: { control: Control<RegisterFormValues> }) {
  return (
    <div className='grid gap-5 sm:grid-cols-2'>
      <Controller
        name='emergencyContact'
        control={control}
        render={({ field, fieldState: { error } }) => (
          <InternationalPhoneInput value={field.value} onChange={(val) => field.onChange(val ?? '')} error={error?.message} label='Contacto de emergencia' />
        )}
      />
      <Controller
        name='bloodType'
        control={control}
        render={({ field, fieldState: { error } }) => (
          <TextField {...field} id='registro-sangre' select fullWidth label='Tipo de sangre' error={!!error} helperText={error?.message}>
            <MenuItem value=''>Seleccionar</MenuItem>
            {BLOOD_TYPE_OPTIONS.map((t) => (
              <MenuItem key={t} value={t}>
                {t}
              </MenuItem>
            ))}
          </TextField>
        )}
      />
      <Controller
        name='allergies'
        control={control}
        render={({ field, fieldState: { error } }) => (
          <TextField
            {...field}
            id='registro-alergias'
            fullWidth
            multiline
            minRows={2}
            maxRows={4}
            label='Alergias (opcional)'
            placeholder='Penicilina, sulfas…'
            error={!!error}
            helperText={error?.message}
            className='sm:col-span-2'
          />
        )}
      />
      <Controller
        name='chronicConditions'
        control={control}
        render={({ field, fieldState: { error } }) => (
          <TextField
            {...field}
            id='registro-cronicas'
            fullWidth
            multiline
            minRows={2}
            maxRows={4}
            label='Condiciones crónicas (opcional)'
            placeholder='Diabetes, hipertensión…'
            error={!!error}
            helperText={error?.message}
            className='sm:col-span-2'
          />
        )}
      />
    </div>
  );
}
