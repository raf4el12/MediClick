'use client';

import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { Controller } from 'react-hook-form';
import type { Clinic } from '@/views/clinics/types';
import { useSpecialtyForm } from '../hooks/useSpecialtyForm';
import type { Category, Specialty } from '../types';

interface AddSpecialtyDrawerProps {
  open: boolean;
  drawerData: { data: Specialty | null; action: 'Create' | 'Update' };
  categories: Category[];
  clinics: Clinic[];
  onClose: () => void;
  onSuccess: () => void;
}

/** Alta y edición de una especialidad (estructura de `AddUserDrawer` de Materio). */
export function AddSpecialtyDrawer({ open, drawerData, categories, clinics, onClose, onSuccess }: AddSpecialtyDrawerProps) {
  const { control, errors, handleSubmit, isLoading, submitError, handleReset } = useSpecialtyForm({ drawerData, onSuccess, onClose });
  const title = drawerData.action === 'Update' ? 'Editar especialidad' : 'Nueva especialidad';

  return (
    <Drawer
      open={open}
      anchor='right'
      variant='temporary'
      onClose={handleReset}
      ModalProps={{ keepMounted: true }}
      slotProps={{ paper: { role: 'dialog', 'aria-modal': true, 'aria-labelledby': 'especialidad-drawer-titulo' } }}
      sx={{ '& .MuiDrawer-paper': { width: { xs: 300, sm: 420 } } }}
    >
      <div className='flex items-center justify-between pli-5 plb-4'>
        <Typography id='especialidad-drawer-titulo' variant='h5' component='h2'>
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
            <TextField
              {...field}
              id='especialidad-nombre'
              fullWidth
              label='Nombre'
              placeholder='Cardiología Pediátrica'
              error={!!errors.name}
              helperText={errors.name?.message}
            />
          )}
        />
        <Controller
          name='categoryId'
          control={control}
          render={({ field }) => (
            <TextField
              select
              id='especialidad-categoria'
              fullWidth
              label='Categoría'
              name={field.name}
              inputRef={field.ref}
              onBlur={field.onBlur}
              value={field.value || ''}
              onChange={(e) => field.onChange(Number(e.target.value))}
              error={!!errors.categoryId}
              helperText={errors.categoryId?.message}
            >
              {categories.map((cat) => (
                <MenuItem key={cat.id} value={cat.id}>
                  {cat.name}
                </MenuItem>
              ))}
            </TextField>
          )}
        />
        <Controller
          name='description'
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              id='especialidad-descripcion'
              fullWidth
              multiline
              minRows={3}
              maxRows={5}
              label='Descripción'
              placeholder='Qué atiende esta especialidad'
              error={!!errors.description}
              helperText={errors.description?.message}
            />
          )}
        />
        <div className='grid gap-5 sm:grid-cols-2'>
          <Controller
            name='duration'
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                id='especialidad-duracion'
                fullWidth
                type='number'
                label='Duración'
                error={!!errors.duration}
                helperText={errors.duration?.message}
                onChange={(e) => field.onChange(Number(e.target.value))}
                slotProps={{ input: { endAdornment: <InputAdornment position='end'>min</InputAdornment> } }}
              />
            )}
          />
          <Controller
            name='price'
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                id='especialidad-precio'
                fullWidth
                type='number'
                label='Precio'
                error={!!errors.price}
                helperText={errors.price?.message}
                onChange={(e) => field.onChange(Number(e.target.value))}
                slotProps={{ input: { startAdornment: <InputAdornment position='start'>S/</InputAdornment> } }}
              />
            )}
          />
        </div>
        <Controller
          name='requirements'
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              id='especialidad-requisitos'
              fullWidth
              multiline
              minRows={2}
              maxRows={4}
              label='Requisitos'
              placeholder='Traer exámenes previos'
              error={!!errors.requirements}
              helperText={errors.requirements?.message}
            />
          )}
        />
        <Controller
          name='clinicId'
          control={control}
          render={({ field }) => (
            <TextField
              select
              id='especialidad-sede'
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
          name='icon'
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              id='especialidad-icono'
              fullWidth
              label='Ícono'
              placeholder='ri-heart-pulse-line'
              error={!!errors.icon}
              helperText={errors.icon?.message}
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
