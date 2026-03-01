'use client';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import Avatar from '@mui/material/Avatar';
import Divider from '@mui/material/Divider';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import Skeleton from '@mui/material/Skeleton';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authService } from '@/services/auth.service';
import { useAppDispatch } from '@/redux-store/hooks';
import { updateUserProfile } from '@/redux-store/slices/auth';
import { profileSchema, type ProfileFormValues } from './functions/profile.schema';
import { useSnackbar } from '@/hooks/useSnackbar';
import { SuccessSnackbar } from '@/components/shared/SuccessSnackbar';
import type { ProfileResponse, UpdateProfileData } from '@/types/profile.types';

const roleLabels: Record<string, string> = {
    ADMIN: 'Administrador',
    DOCTOR: 'Doctor',
    RECEPTIONIST: 'Recepcionista',
    PATIENT: 'Paciente',
};

/* ─── Skeleton ─── */
function ProfileSkeleton() {
    return (
        <Card sx={{ p: { xs: 3, md: 4 }, bgcolor: 'background.paper', borderRadius: 2, boxShadow: 'none', border: '1px solid', borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 4, gap: 3 }}>
                <Skeleton variant="rounded" width={100} height={100} />
                <Box sx={{ flex: 1 }}>
                    <Skeleton variant="text" width={200} height={28} />
                    <Skeleton variant="text" width={250} height={20} />
                    <Skeleton variant="rounded" width={100} height={24} sx={{ mt: 1 }} />
                </Box>
            </Box>
            <Divider sx={{ mb: 4 }} />
            <Grid container spacing={4}>
                {Array.from({ length: 8 }).map((_, i) => (
                    <Grid size={{ xs: 12, sm: 6 }} key={i}>
                        <Skeleton variant="rounded" height={56} />
                    </Grid>
                ))}
            </Grid>
        </Card>
    );
}

/* ─── Form ─── */
function ProfileForm({ userData }: { userData: ProfileResponse }) {
    const dispatch = useAppDispatch();
    const queryClient = useQueryClient();
    const { snackbar, showSnackbar, closeSnackbar } = useSnackbar();

    const profileValues: ProfileFormValues = {
        name: userData.profile?.name ?? '',
        lastName: userData.profile?.lastName ?? '',
        phone: userData.profile?.phone ?? '',
        typeDocument: userData.profile?.typeDocument ?? '',
        numberDocument: userData.profile?.numberDocument ?? '',
        address: userData.profile?.address ?? '',
        state: userData.profile?.state ?? '',
        country: userData.profile?.country ?? '',
    };

    const form = useForm<ProfileFormValues>({
        resolver: zodResolver(profileSchema),
        values: profileValues,
        resetOptions: { keepDirtyValues: true },
        mode: 'onBlur',
    });

    const { control, formState: { errors, isDirty }, reset } = form;

    const mutation = useMutation({
        mutationFn: (data: UpdateProfileData) => authService.updateProfile(data),
        onSuccess: (updatedUser) => {
            queryClient.invalidateQueries({ queryKey: ['auth', 'profile'] });
            dispatch(
                updateUserProfile({
                    name: updatedUser.profile?.name ?? updatedUser.name,
                }),
            );
            reset({
                name: updatedUser.profile?.name ?? '',
                lastName: updatedUser.profile?.lastName ?? '',
                phone: updatedUser.profile?.phone ?? '',
                typeDocument: updatedUser.profile?.typeDocument ?? '',
                numberDocument: updatedUser.profile?.numberDocument ?? '',
                address: updatedUser.profile?.address ?? '',
                state: updatedUser.profile?.state ?? '',
                country: updatedUser.profile?.country ?? '',
            });
            showSnackbar('Perfil actualizado correctamente', 'success');
        },
        onError: () => {
            showSnackbar('Error al actualizar el perfil', 'error');
        },
    });

    const onSubmit = (formData: ProfileFormValues) => {
        const payload: UpdateProfileData = {
            name: formData.name,
            lastName: formData.lastName,
            phone: formData.phone || undefined,
            typeDocument: formData.typeDocument || undefined,
            numberDocument: formData.numberDocument || undefined,
            address: formData.address || undefined,
            state: formData.state || undefined,
            country: formData.country || undefined,
        };
        mutation.mutate(payload);
    };

    const handleReset = () => {
        reset(profileValues);
    };

    const avatarSrc = '/images/avatarSidebar.jpg';
    const fullName = `${userData.profile?.name ?? userData.name} ${userData.profile?.lastName ?? ''}`.trim();

    return (
        <>
            <Card sx={{ p: { xs: 3, md: 4 }, bgcolor: 'background.paper', borderRadius: 2, boxShadow: 'none', border: '1px solid', borderColor: 'divider' }}>
                {/* Cabecera del perfil */}
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 4, gap: 3, flexWrap: { xs: 'wrap', sm: 'nowrap' } }}>
                    <Avatar
                        src={avatarSrc}
                        alt={fullName}
                        variant="rounded"
                        sx={{ width: 100, height: 100, borderRadius: 2, flexShrink: 0 }}
                    />
                    <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                        <Typography variant="h6" fontWeight={600} noWrap>
                            {fullName}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" noWrap>
                            {userData.email}
                        </Typography>
                        <Box sx={{ mt: 1, display: 'flex', gap: 1, alignItems: 'center' }}>
                            <Chip
                                label={roleLabels[userData.role] ?? userData.role}
                                size="small"
                                color="primary"
                                variant="outlined"
                            />
                        </Box>
                    </Box>
                </Box>

                <Divider sx={{ mb: 4 }} />

                {/* Formulario */}
                <Box component="form" onSubmit={form.handleSubmit(onSubmit)}>
                    <Grid container spacing={4}>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <Controller
                                name="name"
                                control={control}
                                render={({ field }) => (
                                    <TextField
                                        {...field}
                                        fullWidth
                                        label="Nombre"
                                        placeholder="Ej: Juan"
                                        error={!!errors.name}
                                        helperText={errors.name?.message}
                                    />
                                )}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <Controller
                                name="lastName"
                                control={control}
                                render={({ field }) => (
                                    <TextField
                                        {...field}
                                        fullWidth
                                        label="Apellido"
                                        placeholder="Ej: Pérez"
                                        error={!!errors.lastName}
                                        helperText={errors.lastName?.message}
                                    />
                                )}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField
                                fullWidth
                                label="Correo Electrónico"
                                value={userData.email}
                                disabled
                                helperText="El correo no se puede modificar"
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <Controller
                                name="phone"
                                control={control}
                                render={({ field }) => (
                                    <TextField
                                        {...field}
                                        fullWidth
                                        label="Teléfono"
                                        placeholder="Ej: 999888777"
                                        error={!!errors.phone}
                                        helperText={errors.phone?.message}
                                    />
                                )}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <Controller
                                name="typeDocument"
                                control={control}
                                render={({ field }) => (
                                    <TextField
                                        {...field}
                                        fullWidth
                                        label="Tipo de Documento"
                                        placeholder="Ej: DNI"
                                        error={!!errors.typeDocument}
                                        helperText={errors.typeDocument?.message}
                                    />
                                )}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <Controller
                                name="numberDocument"
                                control={control}
                                render={({ field }) => (
                                    <TextField
                                        {...field}
                                        fullWidth
                                        label="Número de Documento"
                                        placeholder="Ej: 12345678"
                                        error={!!errors.numberDocument}
                                        helperText={errors.numberDocument?.message}
                                    />
                                )}
                            />
                        </Grid>
                        <Grid size={12}>
                            <Controller
                                name="address"
                                control={control}
                                render={({ field }) => (
                                    <TextField
                                        {...field}
                                        fullWidth
                                        label="Dirección"
                                        placeholder="Ej: Av. Javier Prado 1234"
                                        error={!!errors.address}
                                        helperText={errors.address?.message}
                                    />
                                )}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <Controller
                                name="state"
                                control={control}
                                render={({ field }) => (
                                    <TextField
                                        {...field}
                                        fullWidth
                                        label="Estado / Departamento"
                                        placeholder="Ej: Lima"
                                        error={!!errors.state}
                                        helperText={errors.state?.message}
                                    />
                                )}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <Controller
                                name="country"
                                control={control}
                                render={({ field }) => (
                                    <TextField
                                        {...field}
                                        fullWidth
                                        label="País"
                                        placeholder="Ej: Perú"
                                        error={!!errors.country}
                                        helperText={errors.country?.message}
                                    />
                                )}
                            />
                        </Grid>

                        {/* Botones */}
                        <Grid size={12}>
                            {mutation.isError && (
                                <Alert severity="error" variant="outlined" sx={{ mb: 2 }}>
                                    Error al actualizar el perfil. Inténtalo de nuevo.
                                </Alert>
                            )}
                            <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
                                <Button
                                    type="submit"
                                    variant="contained"
                                    disabled={mutation.isPending || !isDirty}
                                    sx={{ px: 4, textTransform: 'none' }}
                                >
                                    {mutation.isPending ? 'Guardando...' : 'Guardar Cambios'}
                                </Button>
                                <Button
                                    variant="outlined"
                                    color="secondary"
                                    onClick={handleReset}
                                    disabled={mutation.isPending || !isDirty}
                                    sx={{ px: 4, textTransform: 'none' }}
                                >
                                    Restablecer
                                </Button>
                            </Box>
                        </Grid>
                    </Grid>
                </Box>
            </Card>

            <SuccessSnackbar snackbar={snackbar} onClose={closeSnackbar} />
        </>
    );
}

/* ─── Main Component ─── */
export default function MyProfileView() {
    const { data: userData, isLoading } = useQuery({
        queryKey: ['auth', 'profile'],
        queryFn: () => authService.getProfile(),
        staleTime: 2 * 60 * 1000,
    });

    return (
        <Box sx={{ width: '100%' }}>
            <Typography variant="h5" fontWeight={600} sx={{ mb: 3 }}>
                Mi Perfil
            </Typography>
            {isLoading || !userData ? (
                <ProfileSkeleton />
            ) : (
                <ProfileForm userData={userData} />
            )}
        </Box>
    );
}
