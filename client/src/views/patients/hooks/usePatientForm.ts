'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  patientSchema,
  type PatientFormValues,
} from '../functions/patient.schema';
import { useAppDispatch } from '@/redux-store/hooks';
import { createPatientThunk } from '@/redux-store/thunks/patients.thunks';

interface UsePatientFormProps {
  onSuccess: () => void;
  onClose: () => void;
}

export function usePatientForm({ onSuccess, onClose }: UsePatientFormProps) {
  const dispatch = useAppDispatch();
  const [isLoading, setIsLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { control, handleSubmit, reset, formState } =
    useForm<PatientFormValues>({
      resolver: zodResolver(patientSchema),
      defaultValues: {
        name: '',
        lastName: '',
        email: '',
        phone: '',
        birthday: '',
        gender: '',
        typeDocument: '',
        numberDocument: '',
        emergencyContact: '',
        bloodType: '',
        allergies: '',
        chronicConditions: '',
      },
      mode: 'onBlur',
    });

  const onSubmit = async (formData: PatientFormValues) => {
    try {
      setIsLoading(true);
      setSubmitError(null);

      const payload = {
        name: formData.name,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone || undefined,
        birthday: formData.birthday || undefined,
        gender: formData.gender || undefined,
        typeDocument: formData.typeDocument || undefined,
        numberDocument: formData.numberDocument || undefined,
        emergencyContact: formData.emergencyContact,
        bloodType: formData.bloodType,
        allergies: formData.allergies || undefined,
        chronicConditions: formData.chronicConditions || undefined,
      };

      const result = await dispatch(createPatientThunk(payload));

      if (createPatientThunk.fulfilled.match(result)) {
        reset();
        onSuccess();
        onClose();
      } else {
        setSubmitError(
          (result.payload as string) ?? 'Error al registrar el paciente',
        );
      }
    } catch {
      setSubmitError('Error al registrar el paciente');
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
