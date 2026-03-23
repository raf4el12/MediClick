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
import Alert from '@mui/material/Alert';
import Tooltip from '@mui/material/Tooltip';
import InputAdornment from '@mui/material/InputAdornment';
import { Controller } from 'react-hook-form';
import { usePatientForm } from '../hooks/usePatientForm';
import { InternationalPhoneInput } from '@/components/shared/InternationalPhoneInput';

const KEEP_MOUNTED = { keepMounted: true };

interface AddPatientDrawerProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddPatientDrawer({
  open,
  onClose,
  onSuccess,
}: AddPatientDrawerProps) {
  const {
    control,
    errors,
    handleSubmit,
    isLoading,
    submitError,
    handleReset,
    lookingUp,
    lookupDone,
    handleLookupDocument,
    getValues,
  } = usePatientForm({ onSuccess, onClose });

  const canLookup = getValues('typeDocument') === 'DNI' && /^\d{8}$/.test(getValues('numberDocument') || '');

  return (
    <Drawer
      open={open}
      anchor="right"
      variant="temporary"
      onClose={handleReset}
      ModalProps={KEEP_MOUNTED}
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
        <Typography variant="h5">Nuevo Paciente</Typography>
        <IconButton size="small" onClick={handleReset} aria-label="Cerrar formulario de paciente">
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

        {/* Sección: Datos personales */}
        <Typography variant="subtitle2" color="primary" sx={{ fontWeight: 600 }}>
          Datos Personales
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
          <Controller
            name="name"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                label="Nombre *"
                placeholder="Juan"
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
                label="Apellido *"
                placeholder="Pérez"
                error={!!errors.lastName}
                helperText={errors.lastName?.message}
              />
            )}
          />
        </Box>

        <Controller
          name="email"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              fullWidth
              type="email"
              label="Email *"
              placeholder="correo@email.com"
              error={!!errors.email}
              helperText={errors.email?.message}
            />
          )}
        />

        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
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

          <FormControl fullWidth error={!!errors.gender}>
            <InputLabel id="patient-gender-label">Género</InputLabel>
            <Controller
              name="gender"
              control={control}
              render={({ field }) => (
                <Select
                  {...field}
                  labelId="patient-gender-label"
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

        <Controller
          name="birthday"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              fullWidth
              type="date"
              label="Fecha de nacimiento"
              InputLabelProps={{ shrink: true }}
              error={!!errors.birthday}
              helperText={errors.birthday?.message}
            />
          )}
        />

        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
          <FormControl fullWidth error={!!errors.typeDocument}>
            <InputLabel id="patient-doc-type-label">Tipo documento *</InputLabel>
            <Controller
              name="typeDocument"
              control={control}
              render={({ field }) => (
                <Select
                  {...field}
                  labelId="patient-doc-type-label"
                  label="Tipo documento *"
                  value={field.value || ''}
                >
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
                label="Nro. documento *"
                placeholder="12345678"
                error={!!errors.numberDocument}
                helperText={errors.numberDocument?.message}
                slotProps={{
                  input: {
                    endAdornment: (
                      <InputAdornment position="end">
                        <Tooltip title="Buscar datos en RENIEC">
                          <span>
                            <IconButton
                              size="small"
                              onClick={() => void handleLookupDocument()}
                              disabled={lookingUp || !canLookup}
                              color={lookupDone ? 'success' : 'primary'}
                            >
                              {lookingUp ? (
                                <CircularProgress size={18} />
                              ) : lookupDone ? (
                                <i className="ri-check-line" style={{ fontSize: 18 }} />
                              ) : (
                                <i className="ri-search-line" style={{ fontSize: 18 }} />
                              )}
                            </IconButton>
                          </span>
                        </Tooltip>
                      </InputAdornment>
                    ),
                  },
                }}
              />
            )}
          />
        </Box>

        {lookupDone && (
          <Alert severity="success" variant="outlined" sx={{ py: 0.5 }}>
            <Typography variant="caption">
              Datos completados automáticamente desde RENIEC
            </Typography>
          </Alert>
        )}

        <Divider />

        {/* Sección: Información médica */}
        <Typography variant="subtitle2" color="primary" sx={{ fontWeight: 600 }}>
          Información Médica
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
          <Controller
            name="emergencyContact"
            control={control}
            render={({ field }) => (
              <InternationalPhoneInput
                value={field.value}
                onChange={(val) => field.onChange(val ?? '')}
                error={errors.emergencyContact?.message}
                label="Contacto de emergencia *"
              />
            )}
          />

          <FormControl fullWidth error={!!errors.bloodType}>
            <InputLabel id="patient-blood-label">Tipo de sangre *</InputLabel>
            <Controller
              name="bloodType"
              control={control}
              render={({ field }) => (
                <Select
                  {...field}
                  labelId="patient-blood-label"
                  label="Tipo de sangre *"
                  value={field.value || ''}
                >
                  {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map((t) => (
                    <MenuItem key={t} value={t}>{t}</MenuItem>
                  ))}
                </Select>
              )}
            />
            {errors.bloodType && (
              <FormHelperText>{errors.bloodType.message}</FormHelperText>
            )}
          </FormControl>
        </Box>

        <Controller
          name="allergies"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              fullWidth
              multiline
              minRows={2}
              maxRows={4}
              label="Alergias"
              placeholder="Penicilina, Sulfas..."
              error={!!errors.allergies}
              helperText={errors.allergies?.message}
            />
          )}
        />

        <Controller
          name="chronicConditions"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              fullWidth
              multiline
              minRows={2}
              maxRows={4}
              label="Condiciones crónicas"
              placeholder="Diabetes, Hipertensión..."
              error={!!errors.chronicConditions}
              helperText={errors.chronicConditions?.message}
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
