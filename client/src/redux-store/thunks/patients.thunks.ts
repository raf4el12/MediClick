import { createAsyncThunk } from '@reduxjs/toolkit';
import { AxiosError } from 'axios';
import { patientsService } from '@/services/patients.service';
import type { ApiErrorResponse } from '@/types/auth.types';
import type { PaginationParams, PaginatedResponse } from '@/types/pagination.types';
import type { Patient, CreatePatientPayload } from '@/views/patients/types';

export const fetchPatientsThunk = createAsyncThunk<
  PaginatedResponse<Patient>,
  PaginationParams,
  { rejectValue: string }
>('patients/fetchAll', async (pagination, { rejectWithValue }) => {
  try {
    return await patientsService.findAllPaginated(pagination);
  } catch (err) {
    const error = err as AxiosError<ApiErrorResponse>;
    const message = error.response?.data?.message;
    const errorText = Array.isArray(message) ? message[0] : message;
    return rejectWithValue(errorText ?? 'Error al cargar pacientes');
  }
});

export const createPatientThunk = createAsyncThunk<
  Patient,
  CreatePatientPayload,
  { rejectValue: string }
>('patients/create', async (payload, { rejectWithValue }) => {
  try {
    return await patientsService.create(payload);
  } catch (err) {
    const error = err as AxiosError<ApiErrorResponse>;
    const message = error.response?.data?.message;
    const errorText = Array.isArray(message) ? message[0] : message;
    return rejectWithValue(errorText ?? 'Error al registrar el paciente');
  }
});
