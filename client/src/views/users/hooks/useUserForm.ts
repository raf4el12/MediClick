'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  createUserSchema,
  editUserSchema,
  type CreateUserFormValues,
  type EditUserFormValues,
} from '../functions/user.schema';
import { useAppDispatch } from '@/redux-store/hooks';
import { createUserThunk, updateUserThunk } from '@/redux-store/thunks/users.thunks';
import type { User } from '../types';

interface UseUserFormProps {
  onSuccess: () => void;
  onClose: () => void;
  editUser: User | null;
}

export function useUserForm({ onSuccess, onClose, editUser }: UseUserFormProps) {
  const dispatch = useAppDispatch();
  const [isLoading, setIsLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const isEdit = !!editUser;

  const createForm = useForm<CreateUserFormValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      userName: '',
      email: '',
      password: '',
      role: 'RECEPTIONIST',
      profileName: '',
      lastName: '',
      phone: '',
      typeDocument: '',
      numberDocument: '',
    },
    mode: 'onBlur',
  });

  const editForm = useForm<EditUserFormValues>({
    resolver: zodResolver(editUserSchema),
    defaultValues: {
      role: 'RECEPTIONIST',
      isActive: true,
      profileName: '',
      lastName: '',
      phone: '',
      typeDocument: '',
      numberDocument: '',
    },
    mode: 'onBlur',
  });

  useEffect(() => {
    if (editUser) {
      editForm.reset({
        role: editUser.role as 'ADMIN' | 'DOCTOR' | 'RECEPTIONIST',
        isActive: editUser.isActive,
        profileName: editUser.profile?.name ?? '',
        lastName: editUser.profile?.lastName ?? '',
        phone: editUser.profile?.phone ?? '',
        typeDocument: editUser.profile?.typeDocument ?? '',
        numberDocument: editUser.profile?.numberDocument ?? '',
      });
    }
  }, [editUser, editForm]);

  const onCreateSubmit = async (formData: CreateUserFormValues) => {
    try {
      setIsLoading(true);
      setSubmitError(null);

      const payload = {
        name: formData.userName,
        email: formData.email,
        password: formData.password,
        role: formData.role,
        profile: {
          name: formData.profileName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone || undefined,
          typeDocument: formData.typeDocument || undefined,
          numberDocument: formData.numberDocument || undefined,
        },
      };

      const result = await dispatch(createUserThunk(payload));

      if (createUserThunk.fulfilled.match(result)) {
        createForm.reset();
        onSuccess();
        onClose();
      } else {
        setSubmitError(
          (result.payload as string) ?? 'Error al crear usuario',
        );
      }
    } catch {
      setSubmitError('Error al crear usuario');
    } finally {
      setIsLoading(false);
    }
  };

  const onEditSubmit = async (formData: EditUserFormValues) => {
    if (!editUser) return;
    try {
      setIsLoading(true);
      setSubmitError(null);

      const payload = {
        role: formData.role,
        isActive: formData.isActive,
        profile: {
          name: formData.profileName,
          lastName: formData.lastName,
          phone: formData.phone || undefined,
          typeDocument: formData.typeDocument || undefined,
          numberDocument: formData.numberDocument || undefined,
        },
      };

      const result = await dispatch(
        updateUserThunk({ id: editUser.id, payload }),
      );

      if (updateUserThunk.fulfilled.match(result)) {
        editForm.reset();
        onSuccess();
        onClose();
      } else {
        setSubmitError(
          (result.payload as string) ?? 'Error al actualizar usuario',
        );
      }
    } catch {
      setSubmitError('Error al actualizar usuario');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    createForm.reset();
    editForm.reset();
    setSubmitError(null);
    onClose();
  };

  return {
    isEdit,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    control: (isEdit ? editForm.control : createForm.control) as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    errors: (isEdit ? editForm.formState.errors : createForm.formState.errors) as any,
    handleSubmit: isEdit
      ? editForm.handleSubmit(onEditSubmit)
      : createForm.handleSubmit(onCreateSubmit),
    isLoading,
    submitError,
    handleReset,
  };
}
