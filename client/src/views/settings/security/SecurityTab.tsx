'use client';

import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Skeleton from '@mui/material/Skeleton';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { PasswordField } from '@/components/shared/PasswordField';
import { authService } from '@/services/auth.service';
import { getDeviceId } from '@/utils/device-id';
import { extractApiError } from '@/utils/extractApiError';
import { notify } from '@/utils/notify';

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'La contraseña actual es obligatoria'),
    newPassword: z.string().min(8, 'La nueva contraseña debe tener al menos 8 caracteres'),
    confirmPassword: z.string().min(1, 'Confirma tu nueva contraseña'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  });

type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;

const formatSessionDate = (timestamp: number) =>
  new Date(timestamp).toLocaleString('es-PE', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

function deviceLabel(deviceId: string): string {
  if (deviceId === 'web-register') return 'Registro web';
  if (deviceId.length > 12) return `Dispositivo …${deviceId.slice(-8)}`;
  return deviceId;
}

/** Cambio de contraseña (patrón `ChangePasswordCard` de Materio). */
function ChangePasswordCard() {
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  const mutation = useMutation({
    mutationFn: (data: ChangePasswordFormValues) => authService.changePassword(data.currentPassword, data.newPassword),
    onSuccess: () => {
      reset();
      notify('Contraseña cambiada. Se cerraron las demás sesiones.');
    },
    onError: (err) => notify(extractApiError(err, 'No se pudo cambiar la contraseña').message, 'error'),
  });

  const fields = [
    { name: 'currentPassword', label: 'Contraseña actual', autoComplete: 'current-password' },
    { name: 'newPassword', label: 'Nueva contraseña', autoComplete: 'new-password' },
    { name: 'confirmPassword', label: 'Confirmar nueva contraseña', autoComplete: 'new-password' },
  ] as const;

  return (
    <Card>
      <CardHeader title='Cambiar contraseña' subheader='Al cambiarla se cierran las demás sesiones abiertas.' />
      <CardContent>
        <form noValidate onSubmit={handleSubmit((data) => mutation.mutate(data))} className='flex flex-col gap-5 max-is-[480px]'>
          {fields.map(({ name, label, autoComplete }) => (
            <Controller
              key={name}
              name={name}
              control={control}
              render={({ field }) => (
                <PasswordField {...field} id={`seguridad-${name}`} label={label} autoComplete={autoComplete} error={!!errors[name]} helperText={errors[name]?.message} />
              )}
            />
          ))}
          <Button type='submit' variant='contained' disabled={mutation.isPending} className='self-start'>
            {mutation.isPending ? 'Cambiando…' : 'Cambiar contraseña'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

/** Sesiones abiertas por dispositivo (patrón `RecentDevicesTable` de Materio). */
function SessionsCard() {
  const queryClient = useQueryClient();
  const [confirmAll, setConfirmAll] = useState(false);
  const [currentDeviceId] = useState(() => (typeof window !== 'undefined' ? getDeviceId() : ''));

  const sessions = useQuery({
    queryKey: ['auth', 'sessions'],
    queryFn: () => authService.getSessions(currentDeviceId),
    staleTime: 30_000,
  });

  const logoutDevice = useMutation({
    mutationFn: (deviceId: string) => authService.logoutDevice(deviceId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['auth', 'sessions'] });
      notify('Sesión cerrada');
    },
    onError: () => notify('No se pudo cerrar la sesión', 'error'),
  });

  const logoutAll = useMutation({
    mutationFn: () => authService.logoutAllDevices(),
    onSuccess: () => setConfirmAll(false),
    onError: () => notify('No se pudieron cerrar las sesiones', 'error'),
  });

  const others = sessions.data?.filter((s) => !s.isCurrent) ?? [];

  return (
    <Card>
      <CardHeader
        title='Sesiones activas'
        subheader='Dispositivos donde tu cuenta tiene una sesión iniciada.'
        action={
          others.length > 0 && (
            <Button variant='outlined' size='small' startIcon={<i className='ri-logout-box-r-line' aria-hidden />} onClick={() => setConfirmAll(true)}>
              Cerrar todas
            </Button>
          )
        }
      />
      {sessions.isLoading ? (
        <CardContent className='flex flex-col gap-2'>
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} variant='rounded' height={48} />
          ))}
        </CardContent>
      ) : sessions.isError ? (
        <CardContent>
          <Alert severity='error'>No se pudieron cargar las sesiones.</Alert>
        </CardContent>
      ) : !sessions.data?.length ? (
        <CardContent>
          <Typography color='text.secondary'>No hay sesiones activas.</Typography>
        </CardContent>
      ) : (
        <TableContainer>
          <Table aria-label='Sesiones activas'>
            <TableHead>
              <TableRow>
                <TableCell>Dispositivo</TableCell>
                <TableCell>Inicio de sesión</TableCell>
                <TableCell align='right'>
                  <span className='sr-only'>Acciones</span>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sessions.data.map((session) => {
                const label = deviceLabel(session.deviceId);
                return (
                  <TableRow key={session.deviceId}>
                    <TableCell>
                      <div className='flex flex-wrap items-center gap-2'>
                        <i className={session.isCurrent ? 'ri-computer-line text-xl' : 'ri-smartphone-line text-xl'} aria-hidden />
                        <Typography className='font-medium' color='text.primary'>
                          {label}
                        </Typography>
                        {session.isCurrent && <Chip size='small' variant='tonal' color='success' label='Este dispositivo' />}
                      </div>
                    </TableCell>
                    <TableCell>{formatSessionDate(session.createdAt)}</TableCell>
                    <TableCell align='right'>
                      {!session.isCurrent && (
                        <Tooltip title='Cerrar esta sesión'>
                          <IconButton aria-label={`Cerrar la sesión de ${label}`} onClick={() => logoutDevice.mutate(session.deviceId)} disabled={logoutDevice.isPending}>
                            <i className='ri-close-circle-line' aria-hidden />
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      <ConfirmDialog
        open={confirmAll}
        title='Cerrar todas las sesiones'
        description='Se cerrarán las sesiones en los demás dispositivos y tendrás que volver a iniciar sesión en cada uno. Esta sesión no se cierra.'
        confirmLabel='Cerrar todas'
        destructive={false}
        onCancel={() => setConfirmAll(false)}
        onConfirm={() => logoutAll.mutate()}
      />
    </Card>
  );
}

export default function SecurityTab() {
  return (
    <div className='flex flex-col gap-6'>
      <ChangePasswordCard />
      <SessionsCard />
    </div>
  );
}
