'use client';

import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Skeleton from '@mui/material/Skeleton';
import Alert from '@mui/material/Alert';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormHelperText from '@mui/material/FormHelperText';
import { Controller } from 'react-hook-form';
import { useProfileForm } from '../hooks/useProfileForm';
import { InternationalPhoneInput } from '@/components/shared/InternationalPhoneInput';
import { useSnackbar } from '@/hooks/useSnackbar';
import { SuccessSnackbar } from '@/components/shared/SuccessSnackbar';

interface ProfileDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function ProfileDrawer({ open, onClose }: ProfileDrawerProps) {
  const { snackbar, showSnackbar, closeSnackbar } = useSnackbar();

  const { form, isLoadingProfile, isSubmitting, submitError, handleSubmit } =
    useProfileForm({
      open,
      onSuccess: () => {
        showSnackbar('Perfil actualizado correctamente', 'success');
      },
    });

  const { control, formState: { errors } } = form;

  return (
    <>
      <Drawer
        anchor="right"
        open={open}
        onClose={onClose}
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
          <Typography variant="h6" fontWeight={600}>
            Mi Perfil
          </Typography>
          <IconButton onClick={onClose} size="small">
            <i className="ri-close-line" style={{ fontSize: 20 }} />
          </IconButton>
        </Box>

        <Divider />

        {isLoadingProfile ? (
          <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} variant="rounded" height={56} />
            ))}
          </Box>
        ) : (
          <Box
            component="form"
            onSubmit={handleSubmit}
            sx={{
              p: 3,
              display: 'flex',
              flexDirection: 'column',
              gap: 2.5,
              flex: 1,
              overflow: 'auto',
            }}
          >
            {submitError && (
              <Alert severity="error" variant="outlined">
                {submitError}
              </Alert>
            )}

            <Controller
              name="name"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label="Nombre"
                  placeholder="Ej: Juan"
                  error={!!errors.name}
                  helperText={errors.name?.message}
                />
              )}
            />

            <Controller
              name="lastName"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label="Apellido"
                  placeholder="Ej: Pérez"
                  error={!!errors.lastName}
                  helperText={errors.lastName?.message}
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

            <FormControl fullWidth error={!!errors.typeDocument}>
              <InputLabel id="profile-doc-type-label">Tipo de Documento</InputLabel>
              <Controller
                name="typeDocument"
                control={control}
                render={({ field }) => (
                  <Select
                    {...field}
                    labelId="profile-doc-type-label"
                    label="Tipo de Documento"
                    value={field.value || ''}
                  >
                    <MenuItem value="">Sin especificar</MenuItem>
                    <MenuItem value="DNI">DNI</MenuItem>
                    <MenuItem value="CE">Carné de extranjería</MenuItem>
                    <MenuItem value="PASAPORTE">Pasaporte</MenuItem>
                  </Select>
                )}
              />
              {errors.typeDocument && (
                <FormHelperText>{errors.typeDocument.message}</FormHelperText>
              )}
            </FormControl>

            <Controller
              name="numberDocument"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label="Número de Documento"
                  placeholder="Ej: 12345678"
                  error={!!errors.numberDocument}
                  helperText={errors.numberDocument?.message}
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
                  placeholder="Ej: Av. Javier Prado 1234"
                  error={!!errors.address}
                  helperText={errors.address?.message}
                />
              )}
            />

            <Controller
              name="state"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label="Estado / Departamento"
                  placeholder="Ej: Lima"
                  error={!!errors.state}
                  helperText={errors.state?.message}
                />
              )}
            />

            <Controller
              name="country"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label="País"
                  placeholder="Ej: Perú"
                  error={!!errors.country}
                  helperText={errors.country?.message}
                />
              )}
            />

            <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
              <Button
                type="submit"
                variant="contained"
                fullWidth
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Guardando...' : 'Guardar'}
              </Button>
              <Button
                variant="outlined"
                fullWidth
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
            </Box>
          </Box>
        )}
      </Drawer>

      <SuccessSnackbar snackbar={snackbar} onClose={closeSnackbar} />
    </>
  );
}
