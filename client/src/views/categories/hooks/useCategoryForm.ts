'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  categorySchema,
  type CategoryFormValues,
} from '../functions/category.schema';
import { useAppDispatch } from '@/redux-store/hooks';
import {
  createCategoryThunk,
  updateCategoryThunk,
} from '@/redux-store/thunks/categories.thunks';
import type { Category } from '../types';

interface UseCategoryFormProps {
  drawerData: { data: Category | null; action: 'Create' | 'Update' };
  onSuccess: () => void;
  onClose: () => void;
}

export function useCategoryForm({
  drawerData,
  onSuccess,
  onClose,
}: UseCategoryFormProps) {
  const dispatch = useAppDispatch();
  const [isLoading, setIsLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { control, handleSubmit, reset, formState } =
    useForm<CategoryFormValues>({
      resolver: zodResolver(categorySchema),
      defaultValues: {
        name: '',
        description: '',
        icon: '',
        color: '',
        order: undefined,
      },
      mode: 'onBlur',
    });

  useEffect(() => {
    if (drawerData.action === 'Update' && drawerData.data) {
      reset({
        name: drawerData.data.name,
        description: drawerData.data.description ?? '',
        icon: drawerData.data.icon ?? '',
        color: drawerData.data.color ?? '',
        order: drawerData.data.order ?? undefined,
      });
    } else {
      reset({
        name: '',
        description: '',
        icon: '',
        color: '',
        order: undefined,
      });
    }
  }, [drawerData, reset]);

  const onSubmit = async (formData: CategoryFormValues) => {
    try {
      setIsLoading(true);
      setSubmitError(null);

      const payload = {
        ...formData,
        description: formData.description || undefined,
        icon: formData.icon || undefined,
        color: formData.color || undefined,
      };

      let result;

      if (drawerData.action === 'Update' && drawerData.data) {
        result = await dispatch(
          updateCategoryThunk({ id: drawerData.data.id, payload }),
        );
      } else {
        result = await dispatch(createCategoryThunk(payload));
      }

      if (
        createCategoryThunk.fulfilled.match(result) ||
        updateCategoryThunk.fulfilled.match(result)
      ) {
        reset();
        onSuccess();
        onClose();
      } else {
        setSubmitError(
          (result.payload as string) ?? 'Error al guardar la categoría',
        );
      }
    } catch {
      setSubmitError('Error al guardar la categoría');
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
