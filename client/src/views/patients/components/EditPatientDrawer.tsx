'use client';

import { useEffect, useState } from 'react';
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
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { patientsService } from '@/services/patients.service';
import type { Patient } from '../types';

const PHONE_REGEX = /^9\d{8}$/;

const editPatientSchema = z.object({
    name: z.string().min(1, 'El nombre es obligatorio').max(100),
    lastName: z.string().min(1, 'El apellido es obligatorio').max(100),
    phone: z
        .string()
        .regex(PHONE_REGEX, 'Debe ser un celular válido (9 dígitos, inicia con 9)')
        .optional()
        .or(z.literal('')),
    birthday: z.string().optional().or(z.literal('')),
    gender: z.string().optional().or(z.literal('')),
    emergencyContact: z
        .string()
        .min(1, 'El contacto de emergencia es obligatorio')
        .regex(PHONE_REGEX, 'Debe ser un celular válido (9 dígitos, inicia con 9)'),
    bloodType: z.string().min(1, 'El tipo de sangre es obligatorio'),
    allergies: z.string().max(500).optional().or(z.literal('')),
    chronicConditions: z.string().max(500).optional().or(z.literal('')),
});

type EditPatientFormValues = z.infer<typeof editPatientSchema>;

interface EditPatientDrawerProps {
    open: boolean;
    patient: Patient | null;
    onClose: () => void;
    onSuccess: () => void;
}

const KEEP_MOUNTED = { keepMounted: true };

export function EditPatientDrawer({ open, patient, onClose, onSuccess }: EditPatientDrawerProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    const {
        control,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<EditPatientFormValues>({
        resolver: zodResolver(editPatientSchema),
        defaultValues: {
            name: '',
            lastName: '',
            phone: '',
            birthday: '',
            gender: '',
            emergencyContact: '',
            bloodType: '',
            allergies: '',
            chronicConditions: '',
        },
    });

    useEffect(() => {
        if (open && patient) {
            reset({
                name: patient.profile.name,
                lastName: patient.profile.lastName,
                phone: patient.profile.phone ?? '',
                birthday: patient.profile.birthday ? patient.profile.birthday.split('T')[0] : '',
                gender: patient.profile.gender ?? '',
                emergencyContact: patient.emergencyContact,
                bloodType: patient.bloodType,
                allergies: patient.allergies ?? '',
                chronicConditions: patient.chronicConditions ?? '',
            });
            setSubmitError(null);
        }
    }, [open, patient, reset]);

    const onSubmit = async (values: EditPatientFormValues) => {
        if (!patient) return;
        setIsLoading(true);
        setSubmitError(null);
        try {
            await patientsService.update(patient.id, {
                name: values.name,
                lastName: values.lastName,
                phone: values.phone || undefined,
                birthday: values.birthday || undefined,
                gender: values.gender || undefined,
                emergencyContact: values.emergencyContact,
                bloodType: values.bloodType,
                allergies: values.allergies || undefined,
                chronicConditions: values.chronicConditions || undefined,
            });
            onSuccess();
        } catch (err: any) {
            const msg = err?.response?.data?.message;
            setSubmitError(Array.isArray(msg) ? msg[0] : msg ?? 'Error al actualizar el paciente');
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
                <Typography variant="h5">Editar Paciente</Typography>
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
                        <InputLabel id="edit-patient-gender-label">Género</InputLabel>
                        <Controller
                            name="gender"
                            control={control}
                            render={({ field }) => (
                                <Select
                                    {...field}
                                    labelId="edit-patient-gender-label"
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

                <Divider />

                <Typography variant="subtitle2" color="primary" sx={{ fontWeight: 600 }}>
                    Información Médica
                </Typography>

                <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
                    <Controller
                        name="emergencyContact"
                        control={control}
                        render={({ field }) => (
                            <TextField
                                {...field}
                                fullWidth
                                label="Contacto de emergencia *"
                                error={!!errors.emergencyContact}
                                helperText={errors.emergencyContact?.message}
                            />
                        )}
                    />
                    <FormControl fullWidth error={!!errors.bloodType}>
                        <InputLabel id="edit-patient-blood-label">Tipo de sangre *</InputLabel>
                        <Controller
                            name="bloodType"
                            control={control}
                            render={({ field }) => (
                                <Select
                                    {...field}
                                    labelId="edit-patient-blood-label"
                                    label="Tipo de sangre *"
                                    value={field.value || ''}
                                >
                                    {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map((t) => (
                                        <MenuItem key={t} value={t}>{t}</MenuItem>
                                    ))}
                                </Select>
                            )}
                        />
                        {errors.bloodType && <FormHelperText>{errors.bloodType.message}</FormHelperText>}
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
