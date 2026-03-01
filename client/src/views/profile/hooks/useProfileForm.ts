'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authService } from '@/services/auth.service';
import { useAppDispatch } from '@/redux-store/hooks';
import { updateUserProfile } from '@/redux-store/slices/auth';
import { profileSchema, type ProfileFormValues } from '../functions/profile.schema';
import type { UpdateProfileData } from '@/types/profile.types';

interface UseProfileFormProps {
  open: boolean;
  onSuccess: () => void;
}

export function useProfileForm({ open, onSuccess }: UseProfileFormProps) {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();

  const { data: profile, isLoading: isLoadingProfile } = useQuery({
    queryKey: ['auth', 'profile'],
    queryFn: () => authService.getProfile(),
    enabled: open,
    staleTime: 2 * 60 * 1000,
  });

  const profileValues: ProfileFormValues = {
    name: profile?.profile?.name ?? '',
    lastName: profile?.profile?.lastName ?? '',
    phone: profile?.profile?.phone ?? '',
    typeDocument: profile?.profile?.typeDocument ?? '',
    numberDocument: profile?.profile?.numberDocument ?? '',
    address: profile?.profile?.address ?? '',
    state: profile?.profile?.state ?? '',
    country: profile?.profile?.country ?? '',
  };

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    values: profileValues,
    resetOptions: { keepDirtyValues: true },
    mode: 'onBlur',
  });

  const mutation = useMutation({
    mutationFn: (data: UpdateProfileData) => authService.updateProfile(data),
    onSuccess: (updatedUser) => {
      queryClient.invalidateQueries({ queryKey: ['auth', 'profile'] });

      dispatch(
        updateUserProfile({
          name: updatedUser.profile?.name ?? updatedUser.name,
        }),
      );

      onSuccess();
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

  return {
    form,
    isLoadingProfile,
    isSubmitting: mutation.isPending,
    submitError: mutation.error
      ? (mutation.error as Error).message || 'Error al actualizar perfil'
      : null,
    handleSubmit: form.handleSubmit(onSubmit),
  };
}
