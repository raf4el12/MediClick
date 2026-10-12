'use client';

import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { Controller } from 'react-hook-form';
import type { Clinic } from '@/views/clinics/types';
import { useCategoryForm } from '../hooks/useCategoryForm';
import type { Category } from '../types';

interface AddCategoryDrawerProps {
  open: boolean;
  drawerData: { data: Category | null; action: 'Create' | 'Update' };
  clinics: Clinic[];
  onClose: () => void;
  onSuccess: () => void;
}

/** Alta y edición de una categoría (estructura de `AddUserDrawer` de Materio). */
export function AddCategoryDrawer({ open, drawerData, clinics, onClose, onSuccess }: AddCategoryDrawerProps) {
  const { control, errors, handleSubmit, isLoading, submitError, handleReset } = useCategoryForm({ drawerData, onSuccess, onClose });
  const title = drawerData.action === 'Update' ? 'Editar categoría' : 'Nueva categoría';

  return (
    <Drawer
      open={open}
      anchor='right'
      variant='temporary'
      onClose={handleReset}
      ModalProps={{ keepMounted: true }}
      slotProps={{ paper: { role: 'dialog', 'aria-modal': true, 'aria-labelledby': 'categoria-drawer-titulo' } }}
      sx={{ '& .MuiDrawer-paper': { width: { xs: 300, sm: 420 } } }}
    >
      <div className='flex items-center justify-between pli-5 plb-4'>
        <Typography id='categoria-drawer-titulo' variant='h5' component='h2'>
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
            <TextField {...field} id='categoria-nombre' fullWidth label='Nombre' placeholder='Medicina General' error={!!errors.name} helperText={errors.name?.message} />
          )}
        />
        <Controller
          name='description'
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              id='categoria-descripcion'
              fullWidth
              multiline
              minRows={3}
              maxRows={5}
              label='Descripción'
              placeholder='Qué especialidades agrupa'
              error={!!errors.description}
              helperText={errors.description?.message}
            />
          )}
        />
        <div className='grid gap-5 sm:grid-cols-2'>
          <Controller
            name='icon'
            control={control}
            render={({ field }) => (
              <TextField {...field} id='categoria-icono' fullWidth label='Ícono' placeholder='ri-heart-pulse-line' error={!!errors.icon} helperText={errors.icon?.message} />
            )}
          />
          <Controller
            name='color'
            control={control}
            render={({ field }) => (
              <TextField {...field} id='categoria-color' fullWidth label='Color' placeholder='#4CAF50' error={!!errors.color} helperText={errors.color?.message} />
            )}
          />
        </div>
        <Controller
          name='clinicId'
          control={control}
          render={({ field }) => (
            <TextField
              select
              id='categoria-sede'
              fullWidth
              label='Sede'
              name={field.name}
              inputRef={field.ref}
              onBlur={field.onBlur}
              value={field.value ?? ''}
              onChange={(e) => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))}
              helperText='Global aplica a todas las sedes'
              slotProps={{ select: { displayEmpty: true }, inputLabel: { shrink: true } }}
            >
              <MenuItem value=''>Global (todas las sedes)</MenuItem>
              {clinics.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.name}
                </MenuItem>
              ))}
            </TextField>
          )}
        />
        <Controller
          name='order'
          control={control}
          render={({ field }) => (
            <TextField
              id='categoria-orden'
              fullWidth
              type='number'
              label='Orden'
              placeholder='0'
              name={field.name}
              inputRef={field.ref}
              onBlur={field.onBlur}
              value={field.value ?? ''}
              onChange={(e) => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))}
              error={!!errors.order}
              helperText={errors.order?.message}
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
