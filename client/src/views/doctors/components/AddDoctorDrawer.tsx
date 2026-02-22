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
import Chip from '@mui/material/Chip';
import OutlinedInput from '@mui/material/OutlinedInput';
import Alert from '@mui/material/Alert';
import { useMemo } from 'react';
import { Controller } from 'react-hook-form';
import { useDoctorForm } from '../hooks/useDoctorForm';
import type { Specialty } from '@/views/specialties/types';

interface AddDoctorDrawerProps {
  open: boolean;
  specialties: Specialty[];
  onClose: () => void;
  onSuccess: () => void;
}

export function AddDoctorDrawer({
  open,
  specialties,
  onClose,
  onSuccess,
}: AddDoctorDrawerProps) {
  const { control, errors, handleSubmit, isLoading, submitError, handleReset } =
    useDoctorForm({ onSuccess, onClose });

  const specialtyMap = useMemo(() => new Map(specialties.map((s) => [s.id, s])), [specialties]);

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
        <Typography variant="h5">Nuevo Doctor</Typography>
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

        {/* Sección: Cuenta de usuario */}
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
              placeholder="Ej: Dr. Juan Pérez"
              error={!!errors.userName}
              helperText={errors.userName?.message}
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
              placeholder="Ej: dr.juan@mediclick.com"
              error={!!errors.email}
              helperText={errors.email?.message}
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
              error={!!errors.password}
              helperText={errors.password?.message}
            />
          )}
        />

        <Divider />

        {/* Sección: Datos del perfil */}
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

        <Box sx={{ display: 'flex', gap: 2 }}>
          <Controller
            name="phone"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                label="Teléfono"
                placeholder="999888777"
                error={!!errors.phone}
                helperText={errors.phone?.message}
              />
            )}
          />

          <FormControl fullWidth error={!!errors.gender}>
            <InputLabel id="gender-select-label">Género</InputLabel>
            <Controller
              name="gender"
              control={control}
              render={({ field }) => (
                <Select
                  {...field}
                  labelId="gender-select-label"
                  label="Género"
                  value={field.value || ''}
                >
                  <MenuItem value="">Sin especificar</MenuItem>
                  <MenuItem value="M">Masculino</MenuItem>
                  <MenuItem value="F">Femenino</MenuItem>
                </Select>
              )}
            />
            {errors.gender && (
              <FormHelperText>{errors.gender.message}</FormHelperText>
            )}
          </FormControl>
        </Box>

        <Divider />

        {/* Sección: Información médica */}
        <Typography variant="subtitle2" color="primary" sx={{ fontWeight: 600 }}>
          Información Médica
        </Typography>

        <Controller
          name="cmp"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              fullWidth
              label="CMP (Colegio Médico)"
              placeholder="Ej: CMP-12345"
              error={!!errors.cmp}
              helperText={errors.cmp?.message}
            />
          )}
        />

        <Controller
          name="resume"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              fullWidth
              multiline
              minRows={3}
              maxRows={5}
              label="Resumen profesional"
              placeholder="Experiencia y formación del doctor"
              error={!!errors.resume}
              helperText={errors.resume?.message}
            />
          )}
        />

        <FormControl fullWidth error={!!errors.specialtyIds}>
          <InputLabel id="specialties-select-label">Especialidades</InputLabel>
          <Controller
            name="specialtyIds"
            control={control}
            render={({ field }) => (
              <Select
                {...field}
                labelId="specialties-select-label"
                label="Especialidades"
                multiple
                input={<OutlinedInput label="Especialidades" />}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {(selected as number[]).map((id) => (
                      <Chip
                        key={id}
                        label={specialtyMap.get(id)?.name ?? id}
                        size="small"
                      />
                    ))}
                  </Box>
                )}
              >
                {specialties.map((spec) => (
                  <MenuItem key={spec.id} value={spec.id}>
                    {spec.name}
                  </MenuItem>
                ))}
              </Select>
            )}
          />
          {errors.specialtyIds && (
            <FormHelperText>{errors.specialtyIds.message}</FormHelperText>
          )}
        </FormControl>

        <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
          <Button
            variant="contained"
            type="submit"
            disabled={isLoading}
            sx={{ minWidth: 120 }}
          >
            {isLoading ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              'Registrar'
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
