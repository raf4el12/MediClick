'use client';

import Drawer from '@mui/material/Drawer';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormHelperText from '@mui/material/FormHelperText';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import Alert from '@mui/material/Alert';
import { Controller } from 'react-hook-form';
import { useUserForm } from '../hooks/useUserForm';
import type { User } from '../types';

interface AddEditUserDrawerProps {
  open: boolean;
  editUser: User | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddEditUserDrawer({
  open,
  editUser,
  onClose,
  onSuccess,
}: AddEditUserDrawerProps) {
  const { isEdit, control, errors, handleSubmit, isLoading, submitError, handleReset } =
    useUserForm({ onSuccess, onClose, editUser });

  return (
    <Drawer
      open={open}
      anchor="right"
      variant="temporary"
      onClose={handleReset}
      ModalProps={{ keepMounted: true }}
      sx={{ '& .MuiDrawer-paper': { width: { xs: 320, sm: 480 } } }}
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
          {isEdit ? 'Editar Usuario' : 'Nuevo Usuario'}
        </Typography>
        <IconButton size="small" onClick={handleReset}>
          <i className="ri-close-line" style={{ fontSize: 24 }} />
        </IconButton>
      </Box>
      <Divider />

      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2.5, overflow: 'auto' }}
      >
        {submitError && (
          <Alert severity="error">{submitError}</Alert>
        )}

        {!isEdit && (
          <>
            <Typography variant="subtitle2" color="primary" sx={{ fontWeight: 600 }}>
              Cuenta de Usuario
            </Typography>

            <Controller
              name="userName"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label="Nombre de usuario"
                  placeholder="Ej: Juan Pérez"
                  error={!!(errors as any).userName}
                  helperText={(errors as any).userName?.message}
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
                  type="email"
                  label="Email"
                  placeholder="Ej: juan@mediclick.com"
                  error={!!(errors as any).email}
                  helperText={(errors as any).email?.message}
                />
              )}
            />

            <Controller
              name="password"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  type="password"
                  label="Contraseña"
                  placeholder="Mínimo 6 caracteres"
                  error={!!(errors as any).password}
                  helperText={(errors as any).password?.message}
                />
              )}
            />

            <Divider />
          </>
        )}

        <Typography variant="subtitle2" color="primary" sx={{ fontWeight: 600 }}>
          {isEdit ? 'Configuración' : 'Rol y Datos del Perfil'}
        </Typography>

        <FormControl fullWidth error={!!errors.role}>
          <InputLabel id="role-select-label">Rol</InputLabel>
          <Controller
            name="role"
            control={control}
            render={({ field }) => (
              <Select
                {...field}
                labelId="role-select-label"
                label="Rol"
              >
                <MenuItem value="ADMIN">Administrador</MenuItem>
                <MenuItem value="DOCTOR">Doctor</MenuItem>
                <MenuItem value="RECEPTIONIST">Recepcionista</MenuItem>
              </Select>
            )}
          />
          {errors.role && (
            <FormHelperText>{errors.role.message}</FormHelperText>
          )}
        </FormControl>

        {isEdit && (
          <Controller
            name="isActive"
            control={control}
            render={({ field }) => (
              <FormControlLabel
                control={
                  <Switch
                    checked={field.value as boolean}
                    onChange={field.onChange}
                    color="success"
                  />
                }
                label={field.value ? 'Activo' : 'Inactivo'}
              />
            )}
          />
        )}

        <Divider />

        <Typography variant="subtitle2" color="primary" sx={{ fontWeight: 600 }}>
          Datos del Perfil
        </Typography>

        <Box sx={{ display: 'flex', gap: 2 }}>
          <Controller
            name="profileName"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                label="Nombre"
                placeholder="Juan"
                error={!!errors.profileName}
                helperText={errors.profileName?.message}
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
                placeholder="Pérez"
                error={!!errors.lastName}
                helperText={errors.lastName?.message}
              />
            )}
          />
        </Box>

        <Controller
          name="phone"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              fullWidth
              label="Teléfono"
              placeholder="999888777"
              error={!!(errors as any).phone}
              helperText={(errors as any).phone?.message}
            />
          )}
        />

        <Box sx={{ display: 'flex', gap: 2 }}>
          <Controller
            name="typeDocument"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                label="Tipo de Documento"
                placeholder="DNI"
                error={!!(errors as any).typeDocument}
                helperText={(errors as any).typeDocument?.message}
              />
            )}
          />

          <Controller
            name="numberDocument"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                label="Nro. Documento"
                placeholder="12345678"
                error={!!(errors as any).numberDocument}
                helperText={(errors as any).numberDocument?.message}
              />
            )}
          />
        </Box>

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
            ) : isEdit ? (
              'Guardar'
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
