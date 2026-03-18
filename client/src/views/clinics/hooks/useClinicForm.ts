'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAppDispatch } from '@/redux-store/hooks';
import {
  createClinicThunk,
  updateClinicThunk,
} from '@/redux-store/thunks/clinics.thunks';
import type { Clinic } from '../types';

const clinicSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio'),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.union([z.string().email('Email inválido'), z.literal('')]).optional(),
  timezone: z.string().min(1, 'La zona horaria es obligatoria'),
  currency: z.string().min(1, 'La moneda es obligatoria'),
});

type ClinicFormValues = z.infer<typeof clinicSchema>;

interface UseClinicFormParams {
  drawerData: { data: Clinic | null; action: 'Create' | 'Update' };
  onSuccess: () => void;
  onClose: () => void;
}

export function useClinicForm({ drawerData, onSuccess, onClose }: UseClinicFormParams) {
  const dispatch = useAppDispatch();
  const [isLoading, setIsLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    control,
    handleSubmit: rhfHandleSubmit,
    reset,
    formState: { errors },
  } = useForm<ClinicFormValues>({
    resolver: zodResolver(clinicSchema),
    defaultValues: {
      name: '',
      address: '',
      phone: '',
      email: '',
      timezone: 'America/Lima',
      currency: 'PEN',
    },
  });

  useEffect(() => {
    if (drawerData.data) {
      reset({
        name: drawerData.data.name,
        address: drawerData.data.address ?? '',
        phone: drawerData.data.phone ?? '',
        email: drawerData.data.email ?? '',
        timezone: drawerData.data.timezone,
        currency: drawerData.data.currency,
      });
    } else {
      reset({
        name: '',
        address: '',
        phone: '',
        email: '',
        timezone: 'America/Lima',
        currency: 'PEN',
      });
    }
    setSubmitError(null);
  }, [drawerData, reset]);

  const onSubmit = async (values: ClinicFormValues) => {
    setIsLoading(true);
    setSubmitError(null);

    try {
      if (drawerData.action === 'Update' && drawerData.data) {
        const result = await dispatch(
          updateClinicThunk({
            id: drawerData.data.id,
            payload: {
              name: values.name,
              address: values.address || undefined,
              phone: values.phone || undefined,
              email: values.email || undefined,
              timezone: values.timezone,
              currency: values.currency,
            },
          }),
        );

        if (updateClinicThunk.rejected.match(result)) {
          setSubmitError(result.payload ?? 'Error al actualizar');
          return;
        }
      } else {
        const result = await dispatch(
          createClinicThunk({
            name: values.name,
            address: values.address || undefined,
            phone: values.phone || undefined,
            email: values.email || undefined,
            timezone: values.timezone,
            currency: values.currency,
          }),
        );

        if (createClinicThunk.rejected.match(result)) {
          setSubmitError(result.payload ?? 'Error al crear');
          return;
        }
      }

      onSuccess();
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    reset();
    setSubmitError(null);
    onClose();
  };

  return {
    control,
    errors,
    handleSubmit: rhfHandleSubmit(onSubmit),
    isLoading,
    submitError,
    handleReset,
  };
}
