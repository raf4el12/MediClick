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
import { Controller } from 'react-hook-form';
import { useCategoryForm } from '../hooks/useCategoryForm';
import type { Category } from '../types';

interface AddCategoryDrawerProps {
  open: boolean;
  drawerData: { data: Category | null; action: 'Create' | 'Update' };
  onClose: () => void;
  onSuccess: () => void;
}

export function AddCategoryDrawer({
  open,
  drawerData,
  onClose,
  onSuccess,
}: AddCategoryDrawerProps) {
  const { control, errors, handleSubmit, isLoading, submitError, handleReset } =
    useCategoryForm({ drawerData, onSuccess, onClose });

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
            ? 'Editar Categoría'
            : 'Nueva Categoría'}
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
              placeholder="Ej: Medicina General"
              error={!!errors.name}
              helperText={errors.name?.message}
            />
          )}
        />

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
              placeholder="Descripción de la categoría"
              error={!!errors.description}
              helperText={errors.description?.message}
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

        <Controller
          name="color"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              fullWidth
              label="Color"
              placeholder="Ej: #4CAF50"
              error={!!errors.color}
              helperText={errors.color?.message}
            />
          )}
        />

        <Controller
          name="order"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              fullWidth
              type="number"
              label="Orden"
              placeholder="0"
              error={!!errors.order}
              helperText={errors.order?.message}
              value={field.value ?? ''}
              onChange={(e) =>
                field.onChange(
                  e.target.value === '' ? undefined : Number(e.target.value),
                )
              }
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
