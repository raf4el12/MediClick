'use client';

import Alert from '@mui/material/Alert';
import Autocomplete from '@mui/material/Autocomplete';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { Controller } from 'react-hook-form';
import { InternationalPhoneInput } from '@/components/shared/InternationalPhoneInput';
import { useClinicForm } from '../hooks/useClinicForm';
import type { Clinic } from '../types';

const COMMON_TIMEZONES = [
  'America/Lima',
  'America/Bogota',
  'America/Mexico_City',
  'America/Santiago',
  'America/Buenos_Aires',
  'America/Sao_Paulo',
  'America/New_York',
  'America/Chicago',
  'America/Los_Angeles',
  'Europe/Madrid',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Asia/Shanghai',
];

const CURRENCIES = ['PEN', 'USD', 'EUR', 'COP', 'MXN', 'CLP', 'ARS', 'BRL'];

interface AddClinicDrawerProps {
  open: boolean;
  drawerData: { data: Clinic | null; action: 'Create' | 'Update' };
  onClose: () => void;
  onSuccess: () => void;
}

/** Alta y edición de una sede (estructura de `AddUserDrawer` de Materio). */
export function AddClinicDrawer({ open, drawerData, onClose, onSuccess }: AddClinicDrawerProps) {
  const { control, errors, handleSubmit, isLoading, submitError, handleReset } = useClinicForm({ drawerData, onSuccess, onClose });
  const title = drawerData.action === 'Update' ? 'Editar sede' : 'Nueva sede';

  return (
    <Drawer
      open={open}
      anchor='right'
      variant='temporary'
      onClose={handleReset}
      ModalProps={{ keepMounted: true }}
      slotProps={{ paper: { role: 'dialog', 'aria-modal': true, 'aria-labelledby': 'sede-drawer-titulo' } }}
      sx={{ '& .MuiDrawer-paper': { width: { xs: 300, sm: 420 } } }}
    >
      <div className='flex items-center justify-between pli-5 plb-4'>
        <Typography id='sede-drawer-titulo' variant='h5' component='h2'>
          {title}
        </Typography>
        <IconButton size='small' onClick={handleReset} aria-label='Cerrar'>
          <i className='ri-close-line text-2xl' aria-hidden />
        </IconButton>
      </div>
      <Divider />
      <form onSubmit={handleSubmit} noValidate className='flex flex-col gap-5 p-5'>
        {submitError && <Alert severity='error'>{submitError}</Alert>}

        <Controller
          name='name'
          control={control}
          render={({ field }) => (
            <TextField {...field} id='sede-nombre' fullWidth label='Nombre' placeholder='Sede Principal' error={!!errors.name} helperText={errors.name?.message} />
          )}
        />
        <Controller
          name='address'
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              id='sede-direccion'
              fullWidth
              label='Dirección'
              placeholder='Av. Javier Prado 123, Lima'
              error={!!errors.address}
              helperText={errors.address?.message}
            />
          )}
        />
        <Controller
          name='phone'
          control={control}
          render={({ field }) => (
            <InternationalPhoneInput value={field.value} onChange={(val) => field.onChange(val ?? '')} error={errors.phone?.message} label='Teléfono' />
          )}
        />
        <Controller
          name='email'
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              id='sede-email'
              fullWidth
              type='email'
              label='Correo electrónico'
              placeholder='sede@mediclick.com'
              error={!!errors.email}
              helperText={errors.email?.message}
            />
          )}
        />
        <Controller
          name='timezone'
          control={control}
          render={({ field }) => (
            <Autocomplete
              freeSolo
              options={COMMON_TIMEZONES}
              value={field.value}
              onChange={(_, value) => field.onChange(value ?? '')}
              onInputChange={(_, value) => field.onChange(value)}
              renderInput={(params) => (
                <TextField {...params} id='sede-zona' label='Zona horaria' placeholder='America/Lima' error={!!errors.timezone} helperText={errors.timezone?.message} />
              )}
            />
          )}
        />
        <Controller
          name='currency'
          control={control}
          render={({ field }) => (
            <Autocomplete
              freeSolo
              options={CURRENCIES}
              value={field.value}
              onChange={(_, value) => field.onChange(value ?? '')}
              onInputChange={(_, value) => field.onChange(value)}
              renderInput={(params) => (
                <TextField {...params} id='sede-moneda' label='Moneda' placeholder='PEN' error={!!errors.currency} helperText={errors.currency?.message} />
              )}
            />
          )}
        />

        <div className='flex items-center gap-4'>
          <Button variant='contained' type='submit' disabled={isLoading} startIcon={isLoading ? <CircularProgress size={18} color='inherit' /> : undefined}>
            {drawerData.action === 'Update' ? 'Actualizar' : 'Crear'}
          </Button>
          <Button variant='outlined' onClick={handleReset}>
            Cancelar
          </Button>
        </div>
      </form>
    </Drawer>
  );
}
