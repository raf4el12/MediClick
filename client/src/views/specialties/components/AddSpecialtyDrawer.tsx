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
import InputAdornment from '@mui/material/InputAdornment';
import { Controller } from 'react-hook-form';
import { useSpecialtyForm } from '../hooks/useSpecialtyForm';
import type { Specialty, Category } from '../types';

interface AddSpecialtyDrawerProps {
  open: boolean;
  drawerData: { data: Specialty | null; action: 'Create' | 'Update' };
  categories: Category[];
  onClose: () => void;
  onSuccess: () => void;
}

export function AddSpecialtyDrawer({
  open,
  drawerData,
  categories,
  onClose,
  onSuccess,
}: AddSpecialtyDrawerProps) {
  const { control, errors, handleSubmit, isLoading, submitError, handleReset } =
    useSpecialtyForm({ drawerData, onSuccess, onClose });

  return (
    <Drawer
      open={open}
      anchor="right"
      variant="temporary"
      onClose={handleReset}
      ModalProps={{ keepMounted: true }}
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
          {drawerData.action === 'Update'
            ? 'Editar Especialidad'
            : 'Nueva Especialidad'}
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
        {submitError && (
          <Alert severity="error">{submitError}</Alert>
        )}

        <Controller
          name="name"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              fullWidth
              label="Nombre"
              placeholder="Ej: Cardiología Pediátrica"
              error={!!errors.name}
              helperText={errors.name?.message}
            />
          )}
        />

        <FormControl fullWidth error={!!errors.categoryId}>
          <InputLabel id="category-select-label">Categoría</InputLabel>
          <Controller
            name="categoryId"
            control={control}
            render={({ field }) => (
              <Select
                {...field}
                labelId="category-select-label"
                label="Categoría"
                value={field.value || ''}
                onChange={(e) => field.onChange(Number(e.target.value))}
              >
                {categories.map((cat) => (
                  <MenuItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </MenuItem>
                ))}
              </Select>
            )}
          />
          {errors.categoryId && (
            <FormHelperText>{errors.categoryId.message}</FormHelperText>
          )}
        </FormControl>

        <Controller
          name="description"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              fullWidth
              multiline
              minRows={3}
              maxRows={5}
              label="Descripción"
              placeholder="Descripción de la especialidad"
              error={!!errors.description}
              helperText={errors.description?.message}
            />
          )}
        />

        <Controller
          name="duration"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              fullWidth
              type="number"
              label="Duración"
              placeholder="30"
              error={!!errors.duration}
              helperText={errors.duration?.message}
              onChange={(e) => field.onChange(Number(e.target.value))}
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">min</InputAdornment>
                  ),
                },
              }}
            />
          )}
        />

        <Controller
          name="price"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              fullWidth
              type="number"
              label="Precio"
              placeholder="150.00"
              error={!!errors.price}
              helperText={errors.price?.message}
              onChange={(e) => field.onChange(Number(e.target.value))}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">S/</InputAdornment>
                  ),
                },
              }}
            />
          )}
        />

        <Controller
          name="requirements"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              fullWidth
              multiline
              minRows={2}
              maxRows={4}
              label="Requisitos"
              placeholder="Ej: Traer exámenes previos"
              error={!!errors.requirements}
              helperText={errors.requirements?.message}
            />
          )}
        />

        <Controller
          name="icon"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              fullWidth
              label="Ícono"
              placeholder="Ej: ri-heart-pulse-line"
              error={!!errors.icon}
              helperText={errors.icon?.message}
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
              <CircularProgress size={20} color="inherit" />
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
