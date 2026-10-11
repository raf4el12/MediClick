'use client';

import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { InternationalPhoneInput } from '@/components/shared/InternationalPhoneInput';
import { useAppDispatch } from '@/redux-store/hooks';
import { updateUserProfile } from '@/redux-store/slices/auth';
import { authService } from '@/services/auth.service';
import type { ProfileResponse, UpdateProfileData } from '@/types/profile.types';
import { notify } from '@/utils/notify';
import { profileSchema, type ProfileFormValues } from './functions/profile.schema';

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Administrador general',
  ADMIN: 'Administrador',
  DOCTOR: 'Doctor',
  RECEPTIONIST: 'Recepcionista',
  PATIENT: 'Paciente',
};

const DOCUMENT_TYPES = [
  { value: 'DNI', label: 'DNI' },
  { value: 'CE', label: 'Carné de extranjería' },
  { value: 'PASAPORTE', label: 'Pasaporte' },
];

const toFormValues = (user: ProfileResponse): ProfileFormValues => ({
  name: user.profile?.name ?? '',
  lastName: user.profile?.lastName ?? '',
  phone: user.profile?.phone ?? '',
  typeDocument: (user.profile?.typeDocument ?? '') as ProfileFormValues['typeDocument'],
  numberDocument: user.profile?.numberDocument ?? '',
  address: user.profile?.address ?? '',
  state: user.profile?.state ?? '',
  country: user.profile?.country ?? '',
});

const TEXT_FIELDS = [
  { name: 'name', label: 'Nombre', placeholder: 'Ej.: Juan', wide: false },
  { name: 'lastName', label: 'Apellido', placeholder: 'Ej.: Pérez', wide: false },
] as const;

const PLACE_FIELDS = [
  { name: 'address', label: 'Dirección', placeholder: 'Ej.: Av. Javier Prado 1234', wide: true },
  { name: 'state', label: 'Departamento', placeholder: 'Ej.: Lima', wide: false },
  { name: 'country', label: 'País', placeholder: 'Ej.: Perú', wide: false },
] as const;

/** Datos personales (estructura de `AccountDetails` de Materio): tarjeta con avatar y rol, y el formulario. */
export default function AccountTab({ userData }: { userData: ProfileResponse }) {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const saved = toFormValues(userData);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    values: saved,
    resetOptions: { keepDirtyValues: true },
    mode: 'onBlur',
  });
  const {
    control,
    formState: { errors, isDirty },
    reset,
  } = form;

  const mutation = useMutation({
    mutationFn: (data: UpdateProfileData) => authService.updateProfile(data),
    onSuccess: (updatedUser) => {
      void queryClient.invalidateQueries({ queryKey: ['auth', 'profile'] });
      dispatch(updateUserProfile({ name: updatedUser.profile?.name ?? updatedUser.name }));
      reset(toFormValues(updatedUser));
      notify('Perfil actualizado');
    },
    onError: () => notify('No se pudo actualizar el perfil. Inténtalo de nuevo.', 'error'),
  });

  const onSubmit = (data: ProfileFormValues) =>
    mutation.mutate({
      name: data.name,
      lastName: data.lastName,
      phone: data.phone || undefined,
      typeDocument: data.typeDocument || undefined,
      numberDocument: data.numberDocument || undefined,
      address: data.address || undefined,
      state: data.state || undefined,
      country: data.country || undefined,
    });

  const fullName = `${userData.profile?.name ?? userData.name} ${userData.profile?.lastName ?? ''}`.trim();

  const textField = ({ name, label, placeholder, wide }: (typeof TEXT_FIELDS)[number] | (typeof PLACE_FIELDS)[number]) => (
    <Controller
      key={name}
      name={name}
      control={control}
      render={({ field }) => (
        <TextField
          {...field}
          id={`cuenta-${name}`}
          fullWidth
          label={label}
          placeholder={placeholder}
          error={!!errors[name]}
          helperText={errors[name]?.message}
          className={wide ? 'sm:col-span-2' : undefined}
        />
      )}
    />
  );

  return (
    <Card>
      <CardContent>
        <div className='flex max-sm:flex-col items-center gap-6'>
          <Avatar src='/images/avatarSidebar.jpg' alt='' variant='rounded' sx={{ width: 100, height: 100 }} />
          <div className='flex flex-col gap-1 min-is-0 max-sm:items-center'>
            <Typography variant='h5' component='h2'>
              {fullName}
            </Typography>
            <Typography color='text.secondary'>{userData.email}</Typography>
            <Chip size='small' variant='tonal' color='primary' label={ROLE_LABELS[userData.role] ?? userData.role} className='self-start max-sm:self-center' />
          </div>
        </div>
      </CardContent>
      <Divider />
      <CardContent>
        <form noValidate onSubmit={form.handleSubmit(onSubmit)} className='grid gap-5 sm:grid-cols-2'>
          {TEXT_FIELDS.map(textField)}
          {/* Solo lectura y no deshabilitado: el texto deshabilitado no llega al contraste AA. */}
          <TextField
            id='cuenta-email'
            fullWidth
            label='Correo electrónico'
            value={userData.email}
            helperText='El correo no se puede cambiar'
            slotProps={{ input: { readOnly: true } }}
          />
          <Controller
            name='phone'
            control={control}
            render={({ field }) => (
              <InternationalPhoneInput value={field.value} onChange={(val) => field.onChange(val ?? '')} error={errors.phone?.message} label='Teléfono' />
            )}
          />
          <Controller
            name='typeDocument'
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                select
                id='cuenta-tipo-documento'
                fullWidth
                label='Tipo de documento'
                error={!!errors.typeDocument}
                helperText={errors.typeDocument?.message}
              >
                <MenuItem value=''>Sin documento</MenuItem>
                {DOCUMENT_TYPES.map((t) => (
                  <MenuItem key={t.value} value={t.value}>
                    {t.label}
                  </MenuItem>
                ))}
              </TextField>
            )}
          />
          <Controller
            name='numberDocument'
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                id='cuenta-numero-documento'
                fullWidth
                label='Número de documento'
                placeholder='Ej.: 12345678'
                error={!!errors.numberDocument}
                helperText={errors.numberDocument?.message}
              />
            )}
          />
          {PLACE_FIELDS.map(textField)}
          <div className='flex flex-wrap gap-3 sm:col-span-2'>
            <Button type='submit' variant='contained' disabled={mutation.isPending || !isDirty}>
              {mutation.isPending ? 'Guardando…' : 'Guardar cambios'}
            </Button>
            <Button variant='outlined' onClick={() => reset(saved)} disabled={mutation.isPending || !isDirty}>
              Restablecer
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
