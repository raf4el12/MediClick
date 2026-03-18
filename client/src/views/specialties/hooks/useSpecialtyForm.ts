'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  specialtySchema,
  type SpecialtyFormValues,
} from '../functions/specialty.schema';
import { useAppDispatch } from '@/redux-store/hooks';
import {
  createSpecialtyThunk,
  updateSpecialtyThunk,
} from '@/redux-store/thunks/specialties.thunks';
import type { Specialty } from '../types';

interface UseSpecialtyFormProps {
  drawerData: { data: Specialty | null; action: 'Create' | 'Update' };
  onSuccess: () => void;
  onClose: () => void;
}

export function useSpecialtyForm({
  drawerData,
  onSuccess,
  onClose,
}: UseSpecialtyFormProps) {
  const dispatch = useAppDispatch();
  const [isLoading, setIsLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { control, handleSubmit, reset, formState } =
    useForm<SpecialtyFormValues>({
      resolver: zodResolver(specialtySchema),
      defaultValues: {
        categoryId: 0,
        name: '',
        description: '',
        duration: 30,
        price: 0,
        requirements: '',
        icon: '',
        clinicId: undefined,
      },
      mode: 'onBlur',
    });

  useEffect(() => {
    if (drawerData.action === 'Update' && drawerData.data) {
      reset({
        categoryId: drawerData.data.category.id,
        name: drawerData.data.name,
        description: drawerData.data.description ?? '',
        duration: drawerData.data.duration ?? 30,
        price: drawerData.data.price ?? 0,
        requirements: drawerData.data.requirements ?? '',
        icon: drawerData.data.icon ?? '',
        clinicId: drawerData.data.clinicId ?? undefined,
      });
    } else {
      reset({
        categoryId: 0,
        name: '',
        description: '',
        duration: 30,
        price: 0,
        requirements: '',
        icon: '',
        clinicId: undefined,
      });
    }
  }, [drawerData, reset]);

  const onSubmit = async (formData: SpecialtyFormValues) => {
    try {
      setIsLoading(true);
      setSubmitError(null);

      const payload = {
        ...formData,
        description: formData.description || undefined,
        requirements: formData.requirements || undefined,
        icon: formData.icon || undefined,
        clinicId: formData.clinicId || undefined,
      };

      let result;

      if (drawerData.action === 'Update' && drawerData.data) {
        result = await dispatch(
          updateSpecialtyThunk({ id: drawerData.data.id, payload }),
        );
      } else {
        result = await dispatch(createSpecialtyThunk(payload));
      }

      if (
        createSpecialtyThunk.fulfilled.match(result) ||
        updateSpecialtyThunk.fulfilled.match(result)
      ) {
        reset();
        onSuccess();
        onClose();
      } else {
        setSubmitError(
          (result.payload as string) ?? 'Error al guardar la especialidad',
        );
      }
    } catch {
      setSubmitError('Error al guardar la especialidad');
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
