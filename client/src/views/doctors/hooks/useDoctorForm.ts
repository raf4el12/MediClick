'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  doctorSchema,
  type DoctorFormValues,
} from '../functions/doctor.schema';
import { useAppDispatch } from '@/redux-store/hooks';
import { onboardDoctorThunk } from '@/redux-store/thunks/doctors.thunks';

interface UseDoctorFormProps {
  onSuccess: () => void;
  onClose: () => void;
}

export function useDoctorForm({ onSuccess, onClose }: UseDoctorFormProps) {
  const dispatch = useAppDispatch();
  const [isLoading, setIsLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { control, handleSubmit, reset, formState } =
    useForm<DoctorFormValues>({
      resolver: zodResolver(doctorSchema),
      defaultValues: {
        userName: '',
        email: '',
        password: '',
        profileName: '',
        lastName: '',
        phone: '',
        gender: '',
        cmp: '',
        resume: '',
        specialtyIds: [],
      },
      mode: 'onBlur',
    });

  const onSubmit = async (formData: DoctorFormValues) => {
    try {
      setIsLoading(true);
      setSubmitError(null);

      const payload = {
        user: {
          name: formData.userName,
          email: formData.email,
          password: formData.password,
        },
        profile: {
          name: formData.profileName,
          lastName: formData.lastName,
          phone: formData.phone || undefined,
          gender: formData.gender || undefined,
        },
        cmp: formData.cmp,
        resume: formData.resume || undefined,
        specialtyIds: formData.specialtyIds,
      };

      const result = await dispatch(onboardDoctorThunk(payload));

      if (onboardDoctorThunk.fulfilled.match(result)) {
        reset();
        onSuccess();
        onClose();
      } else {
        setSubmitError(
          (result.payload as string) ?? 'Error al registrar el doctor',
        );
      }
    } catch {
      setSubmitError('Error al registrar el doctor');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    reset();
    onClose();
  };

  return {
    control,
    errors: formState.errors,
    handleSubmit: handleSubmit(onSubmit),
    isLoading,
    submitError,
    handleReset,
  };
}
