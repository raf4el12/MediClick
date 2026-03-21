'use client';

import Drawer from '@mui/material/Drawer';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Autocomplete from '@mui/material/Autocomplete';
import { Controller } from 'react-hook-form';
import { useClinicForm } from '../hooks/useClinicForm';
import { InternationalPhoneInput } from '@/components/shared/InternationalPhoneInput';
import type { Clinic } from '../types';

const KEEP_MOUNTED = { keepMounted: true };

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

export function AddClinicDrawer({
  open,
  drawerData,
  onClose,
  onSuccess,
}: AddClinicDrawerProps) {
  const { control, errors, handleSubmit, isLoading, submitError, handleReset } =
    useClinicForm({ drawerData, onSuccess, onClose });

  return (
    <Drawer
      open={open}
      anchor="right"
      variant="temporary"
      onClose={handleReset}
      ModalProps={KEEP_MOUNTED}
      sx={{ '& .MuiDrawer-paper': { width: { xs: 320, sm: 420 } } }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 3,
          py: 2,
        }}
      >
        <Typography variant="h5">
          {drawerData.action === 'Update' ? 'Editar Sede' : 'Nueva Sede'}
        </Typography>
        <IconButton size="small" onClick={handleReset}>
          <i className="ri-close-line" style={{ fontSize: 24 }} />
        </IconButton>
      </Box>
      <Divider />

      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2.5 }}
      >
        {submitError && <Alert severity="error">{submitError}</Alert>}

        <Controller
          name="name"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              fullWidth
              label="Nombre"
              placeholder="Ej: Sede Principal"
              error={!!errors.name}
              helperText={errors.name?.message}
            />
          )}
        />

        <Controller
          name="address"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              fullWidth
              label="Dirección"
              placeholder="Ej: Av. Javier Prado 123, Lima"
              error={!!errors.address}
              helperText={errors.address?.message}
            />
          )}
        />

        <Controller
          name="phone"
          control={control}
          render={({ field }) => (
            <InternationalPhoneInput
              value={field.value}
              onChange={(val) => field.onChange(val ?? '')}
              error={errors.phone?.message}
              label="Teléfono"
            />
          )}
        />

        <Controller
          name="email"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              fullWidth
              label="Email"
              placeholder="Ej: sede@mediclick.com"
              error={!!errors.email}
              helperText={errors.email?.message}
            />
          )}
        />

        <Controller
          name="timezone"
          control={control}
          render={({ field }) => (
            <Autocomplete
              freeSolo
              options={COMMON_TIMEZONES}
              value={field.value}
              onChange={(_, value) => field.onChange(value ?? '')}
              onInputChange={(_, value) => field.onChange(value)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Zona Horaria"
                  placeholder="Ej: America/Lima"
                  error={!!errors.timezone}
                  helperText={errors.timezone?.message}
                />
              )}
            />
          )}
        />

        <Controller
          name="currency"
          control={control}
          render={({ field }) => (
            <Autocomplete
              freeSolo
              options={CURRENCIES}
              value={field.value}
              onChange={(_, value) => field.onChange(value ?? '')}
              onInputChange={(_, value) => field.onChange(value)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Moneda"
                  placeholder="Ej: PEN"
                  error={!!errors.currency}
                  helperText={errors.currency?.message}
                />
              )}
            />
          )}
        />

        <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
          <Button
            variant="contained"
            type="submit"
            disabled={isLoading}
            sx={{ minWidth: 120 }}
          >
            {isLoading ? (
              <>
                <CircularProgress size={20} color="inherit" sx={{ mr: 1 }} />
                Guardando...
              </>
            ) : drawerData.action === 'Update' ? (
              'Actualizar'
            ) : (
              'Crear'
            )}
          </Button>
          <Button variant="outlined" color="error" onClick={handleReset}>
            Cancelar
          </Button>
        </Box>
      </Box>
    </Drawer>
  );
}
