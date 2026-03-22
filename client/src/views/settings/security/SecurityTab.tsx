'use client';

import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import Skeleton from '@mui/material/Skeleton';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';
import { alpha, useTheme } from '@mui/material/styles';
import { PasswordField } from '@/components/shared/PasswordField';
import { authService } from '@/services/auth.service';
import { getDeviceId } from '@/utils/device-id';
import { useSnackbar } from '@/hooks/useSnackbar';
import { SuccessSnackbar } from '@/components/shared/SuccessSnackbar';

/* ─── Change Password Schema ─── */
const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'La contraseña actual es obligatoria'),
    newPassword: z
      .string()
      .min(8, 'La nueva contraseña debe tener al menos 8 caracteres'),
    confirmPassword: z.string().min(1, 'Confirma tu nueva contraseña'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  });

type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;

/* ─── Helpers ─── */
function formatSessionDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getDeviceLabel(deviceId: string): string {
  if (deviceId === 'web-register') return 'Registro web';
  if (deviceId.length > 12) return `Dispositivo …${deviceId.slice(-8)}`;
  return deviceId;
}

/* ─── Card wrapper ─── */
const cardSx = {
  p: { xs: 3, md: 4 },
  bgcolor: 'background.paper',
  borderRadius: 2,
  boxShadow: 'none',
  border: '1px solid',
  borderColor: 'divider',
};

/* ─── Change Password Section ─── */
function ChangePasswordSection() {
  const { snackbar, showSnackbar, closeSnackbar } = useSnackbar();

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const mutation = useMutation({
    mutationFn: (data: ChangePasswordFormValues) =>
      authService.changePassword(data.currentPassword, data.newPassword),
    onSuccess: () => {
      reset();
      showSnackbar('Contraseña cambiada exitosamente. Las demás sesiones fueron cerradas.', 'success');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      showSnackbar(
        Array.isArray(msg) ? msg[0] : msg ?? 'Error al cambiar la contraseña',
        'error',
      );
    },
  });

  const onSubmit = (data: ChangePasswordFormValues) => {
    mutation.mutate(data);
  };

  return (
    <>
      <Card sx={cardSx}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
          <i className="ri-lock-password-line" style={{ fontSize: 22 }} />
          <Typography variant="h6" fontWeight={600}>
            Cambiar Contraseña
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Al cambiar tu contraseña, se cerrarán todas las demás sesiones activas por seguridad.
        </Typography>

        <Box
          component="form"
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, maxWidth: 480 }}
        >
          <Controller
            name="currentPassword"
            control={control}
            render={({ field }) => (
              <PasswordField
                {...field}
                label="Contraseña actual"
                autoComplete="current-password"
                error={!!errors.currentPassword}
                helperText={errors.currentPassword?.message}
              />
            )}
          />

          <Controller
            name="newPassword"
            control={control}
            render={({ field }) => (
              <PasswordField
                {...field}
                label="Nueva contraseña"
                autoComplete="new-password"
                error={!!errors.newPassword}
                helperText={errors.newPassword?.message}
              />
            )}
          />

          <Controller
            name="confirmPassword"
            control={control}
            render={({ field }) => (
              <PasswordField
                {...field}
                label="Confirmar nueva contraseña"
                autoComplete="new-password"
                error={!!errors.confirmPassword}
                helperText={errors.confirmPassword?.message}
              />
            )}
          />

          <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
            <Button
              type="submit"
              variant="contained"
              disabled={mutation.isPending}
              sx={{ px: 4, textTransform: 'none' }}
            >
              {mutation.isPending ? (
                <CircularProgress size={22} color="inherit" />
              ) : (
                'Cambiar Contraseña'
              )}
            </Button>
          </Box>
        </Box>
      </Card>
      <SuccessSnackbar snackbar={snackbar} onClose={closeSnackbar} />
    </>
  );
}

/* ─── Sessions Section ─── */
function SessionsSection() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const { snackbar, showSnackbar, closeSnackbar } = useSnackbar();
  const [logoutAllOpen, setLogoutAllOpen] = useState(false);

  const currentDeviceId = typeof window !== 'undefined' ? getDeviceId() : '';

  const {
    data: sessions,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['auth', 'sessions'],
    queryFn: () => authService.getSessions(currentDeviceId),
    staleTime: 30 * 1000,
  });

  const logoutDeviceMutation = useMutation({
    mutationFn: (deviceId: string) => authService.logoutDevice(deviceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth', 'sessions'] });
      showSnackbar('Sesión cerrada', 'success');
    },
    onError: () => {
      showSnackbar('Error al cerrar la sesión', 'error');
    },
  });

  const logoutAllMutation = useMutation({
    mutationFn: () => authService.logoutAllDevices(),
    onSuccess: () => {
      setLogoutAllOpen(false);
      // After logging out all, user will be redirected by the axios interceptor
    },
    onError: () => {
      showSnackbar('Error al cerrar las sesiones', 'error');
    },
  });

  const otherSessions = sessions?.filter((s) => !s.isCurrent) ?? [];

  return (
    <>
      <Card sx={cardSx}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1, flexWrap: 'wrap', gap: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <i className="ri-device-line" style={{ fontSize: 22 }} />
            <Typography variant="h6" fontWeight={600}>
              Sesiones Activas
            </Typography>
          </Box>
          {otherSessions.length > 0 && (
            <Button
              variant="outlined"
              color="error"
              size="small"
              onClick={() => setLogoutAllOpen(true)}
              startIcon={<i className="ri-logout-box-r-line" style={{ fontSize: 16 }} />}
              sx={{ textTransform: 'none' }}
            >
              Cerrar todas
            </Button>
          )}
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Dispositivos donde tu cuenta tiene una sesión iniciada.
        </Typography>

        {isLoading ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} variant="rounded" height={64} />
            ))}
          </Box>
        ) : isError ? (
          <Alert severity="error">No se pudieron cargar las sesiones.</Alert>
        ) : !sessions || sessions.length === 0 ? (
          <Alert severity="info">No se encontraron sesiones activas.</Alert>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {sessions.map((session) => (
              <Box
                key={session.deviceId}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  p: 2,
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: session.isCurrent
                    ? alpha(theme.palette.success.main, 0.4)
                    : 'divider',
                  bgcolor: session.isCurrent
                    ? alpha(theme.palette.success.main, 0.04)
                    : 'transparent',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, minWidth: 0 }}>
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: 2,
                      bgcolor: session.isCurrent
                        ? alpha(theme.palette.success.main, 0.12)
                        : alpha(theme.palette.grey[500], 0.12),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <i
                      className={session.isCurrent ? 'ri-computer-line' : 'ri-device-line'}
                      style={{
                        fontSize: 20,
                        color: session.isCurrent
                          ? theme.palette.success.main
                          : theme.palette.text.secondary,
                      }}
                    />
                  </Box>
                  <Box sx={{ minWidth: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" fontWeight={600} noWrap>
                        {getDeviceLabel(session.deviceId)}
                      </Typography>
                      {session.isCurrent && (
                        <Chip label="Este dispositivo" size="small" color="success" variant="outlined" />
                      )}
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      Inicio de sesión: {formatSessionDate(session.createdAt)}
                    </Typography>
                  </Box>
                </Box>

                {!session.isCurrent && (
                  <Tooltip title="Cerrar esta sesión">
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => logoutDeviceMutation.mutate(session.deviceId)}
                      disabled={logoutDeviceMutation.isPending}
                    >
                      <i className="ri-close-circle-line" style={{ fontSize: 20 }} />
                    </IconButton>
                  </Tooltip>
                )}
              </Box>
            ))}
          </Box>
        )}
      </Card>

      {/* Confirm logout all dialog */}
      <Dialog open={logoutAllOpen} onClose={() => setLogoutAllOpen(false)}>
        <DialogTitle>Cerrar todas las sesiones</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Se cerrarán todas las sesiones en otros dispositivos. Tendrás que iniciar sesión
            nuevamente en cada uno. Tu sesión actual no se verá afectada.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLogoutAllOpen(false)} disabled={logoutAllMutation.isPending}>
            Cancelar
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => logoutAllMutation.mutate()}
            disabled={logoutAllMutation.isPending}
          >
            {logoutAllMutation.isPending ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              'Cerrar todas'
            )}
          </Button>
        </DialogActions>
      </Dialog>

      <SuccessSnackbar snackbar={snackbar} onClose={closeSnackbar} />
    </>
  );
}

/* ─── Main export ─── */
export default function SecurityTab() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <ChangePasswordSection />
      <Divider />
      <SessionsSection />
    </Box>
  );
}
