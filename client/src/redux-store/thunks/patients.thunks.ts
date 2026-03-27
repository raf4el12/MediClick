import { createAsyncThunk } from '@reduxjs/toolkit';
import { patientsService } from '@/services/patients.service';
import { extractThunkError } from '@/utils/extractThunkError';
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
    return rejectWithValue(extractThunkError(err, 'Error al cargar pacientes'));
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
    return rejectWithValue(extractThunkError(err, 'Error al registrar el paciente'));
  }
});
