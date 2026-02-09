'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  specialtySchema,
  type SpecialtyFormValues,
} from '../functions/specialty.schema';
import { specialtiesService } from '@/services/specialties.service';
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
      };

      if (drawerData.action === 'Update' && drawerData.data) {
        await specialtiesService.update(drawerData.data.id, payload);
      } else {
        await specialtiesService.create(payload);
      }

      reset();
      onSuccess();
      onClose();
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
