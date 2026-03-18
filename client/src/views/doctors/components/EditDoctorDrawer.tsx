'use client';

import { useEffect, useMemo, useState } from 'react';
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
import Alert from '@mui/material/Alert';
import OutlinedInput from '@mui/material/OutlinedInput';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { doctorsService } from '@/services/doctors.service';
import type { Doctor } from '../types';
import type { Specialty } from '@/views/specialties/types';
import type { Clinic } from '@/views/clinics/types';

const PHONE_REGEX = /^9\d{8}$/;
const CMP_REGEX = /^\d{5,6}$/;

const editDoctorSchema = z.object({
    name: z.string().min(1, 'El nombre es obligatorio').max(100),
    lastName: z.string().min(1, 'El apellido es obligatorio').max(100),
    phone: z
        .string()
        .regex(PHONE_REGEX, 'Debe ser un celular válido (9 dígitos, inicia con 9)')
        .optional()
        .or(z.literal('')),
    gender: z.string().optional().or(z.literal('')),
    licenseNumber: z
        .string()
        .min(1, 'El CMP es obligatorio')
        .regex(CMP_REGEX, 'El CMP debe tener 5 o 6 dígitos'),
    resume: z.string().max(1000).optional().or(z.literal('')),
    clinicId: z.number().int().optional(),
    specialtyIds: z.array(z.number().int()).min(1, 'Debe seleccionar al menos una especialidad'),
});

type EditDoctorFormValues = z.infer<typeof editDoctorSchema>;

interface EditDoctorDrawerProps {
    open: boolean;
    doctor: Doctor | null;
    specialties: Specialty[];
    clinics: Clinic[];
    onClose: () => void;
    onSuccess: () => void;
}

const KEEP_MOUNTED = { keepMounted: true };

export function EditDoctorDrawer({ open, doctor, specialties, clinics, onClose, onSuccess }: EditDoctorDrawerProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const specialtyMap = useMemo(() => new Map(specialties.map((s) => [s.id, s])), [specialties]);

    const {
        control,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<EditDoctorFormValues>({
        resolver: zodResolver(editDoctorSchema),
        defaultValues: {
            name: '',
            lastName: '',
            phone: '',
            gender: '',
            licenseNumber: '',
            resume: '',
            clinicId: undefined,
            specialtyIds: [],
        },
    });

    useEffect(() => {
        if (open && doctor) {
            reset({
                name: doctor.profile.name,
                lastName: doctor.profile.lastName,
                phone: doctor.profile.phone ?? '',
                gender: doctor.profile.gender ?? '',
                licenseNumber: doctor.licenseNumber,
                resume: doctor.resume ?? '',
                clinicId: doctor.clinicId ?? undefined,
                specialtyIds: doctor.specialties.map((s) => s.id),
            });
            setSubmitError(null);
        }
    }, [open, doctor, reset]);

    const onSubmit = async (values: EditDoctorFormValues) => {
        if (!doctor) return;
        setIsLoading(true);
        setSubmitError(null);
        try {
            await doctorsService.update(doctor.id, {
                name: values.name,
                lastName: values.lastName,
                phone: values.phone || undefined,
                gender: values.gender || undefined,
                licenseNumber: values.licenseNumber,
                resume: values.resume || undefined,
                clinicId: values.clinicId,
                specialtyIds: values.specialtyIds,
            });
            onSuccess();
        } catch (err: any) {
            const msg = err?.response?.data?.message;
            setSubmitError(Array.isArray(msg) ? msg[0] : msg ?? 'Error al actualizar el doctor');
        } finally {
            setIsLoading(false);
        }
    };

    const handleClose = () => {
        setSubmitError(null);
        onClose();
    };

    return (
        <Drawer
            open={open}
            anchor="right"
            variant="temporary"
            onClose={handleClose}
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
                <Typography variant="h5">Editar Doctor</Typography>
                <IconButton size="small" onClick={handleClose} aria-label="Cerrar formulario">
                    <i className="ri-close-line" style={{ fontSize: 24 }} />
                </IconButton>
            </Box>
            <Divider />

            <Box
                component="form"
                onSubmit={handleSubmit(onSubmit)}
                sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2.5, overflow: 'auto' }}
            >
                {submitError && <Alert severity="error">{submitError}</Alert>}

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
                                error={!!errors.lastName}
                                helperText={errors.lastName?.message}
                            />
                        )}
                    />
                </Box>

                <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
                    <Controller
                        name="phone"
                        control={control}
                        render={({ field }) => (
                            <TextField
                                {...field}
                                fullWidth
                                label="Teléfono"
                                error={!!errors.phone}
                                helperText={errors.phone?.message}
                            />
                        )}
                    />
                    <FormControl fullWidth error={!!errors.gender}>
                        <InputLabel id="edit-doctor-gender-label">Género</InputLabel>
                        <Controller
                            name="gender"
                            control={control}
                            render={({ field }) => (
                                <Select
                                    {...field}
                                    labelId="edit-doctor-gender-label"
                                    label="Género"
                                    value={field.value || ''}
                                >
                                    <MenuItem value="">Sin especificar</MenuItem>
                                    <MenuItem value="M">Masculino</MenuItem>
                                    <MenuItem value="F">Femenino</MenuItem>
                                </Select>
                            )}
                        />
                        {errors.gender && <FormHelperText>{errors.gender.message}</FormHelperText>}
                    </FormControl>
                </Box>

                <Divider />

                <Typography variant="subtitle2" color="primary" sx={{ fontWeight: 600 }}>
                    Información Profesional
                </Typography>

                <Controller
                    name="licenseNumber"
                    control={control}
                    render={({ field }) => (
                        <TextField
                            {...field}
                            fullWidth
                            label="CMP *"
                            error={!!errors.licenseNumber}
                            helperText={errors.licenseNumber?.message}
                        />
                    )}
                />

                <FormControl fullWidth>
                    <InputLabel id="edit-doctor-clinic-label">Sede</InputLabel>
                    <Controller
                        name="clinicId"
                        control={control}
                        render={({ field }) => (
                            <Select
                                {...field}
                                labelId="edit-doctor-clinic-label"
                                label="Sede"
                                value={field.value ?? ''}
                                onChange={(e) => {
                                    const v = e.target.value as string | number;
                                    field.onChange(v === '' ? undefined : Number(v));
                                }}
                            >
                                <MenuItem value="">Sin asignar</MenuItem>
                                {clinics.map((c) => (
                                    <MenuItem key={c.id} value={c.id}>
                                        {c.name} ({c.timezone})
                                    </MenuItem>
                                ))}
                            </Select>
                        )}
                    />
                </FormControl>

                <FormControl fullWidth error={!!errors.specialtyIds}>
                    <InputLabel id="edit-doctor-specialties-label">Especialidades *</InputLabel>
                    <Controller
                        name="specialtyIds"
                        control={control}
                        render={({ field }) => (
                            <Select
                                {...field}
                                multiple
                                labelId="edit-doctor-specialties-label"
                                label="Especialidades *"
                                input={<OutlinedInput label="Especialidades *" />}
                                renderValue={(selected) => (
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                        {(selected as number[]).map((id) => (
                                            <Chip key={id} label={specialtyMap.get(id)?.name ?? id} size="small" />
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
                    {errors.specialtyIds && <FormHelperText>{errors.specialtyIds.message}</FormHelperText>}
                </FormControl>

                <Controller
                    name="resume"
                    control={control}
                    render={({ field }) => (
                        <TextField
                            {...field}
                            fullWidth
                            multiline
                            minRows={2}
                            maxRows={4}
                            label="Resumen profesional"
                            error={!!errors.resume}
                            helperText={errors.resume?.message}
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
                            'Actualizar'
                        )}
                    </Button>
                    <Button variant="outlined" color="error" onClick={handleClose}>
                        Cancelar
                    </Button>
                </Box>
            </Box>
        </Drawer>
    );
}
