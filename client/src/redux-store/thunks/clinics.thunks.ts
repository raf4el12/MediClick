import { createAsyncThunk } from '@reduxjs/toolkit';
import { clinicsService } from '@/services/clinics.service';
import { extractThunkError } from '@/utils/extractThunkError';
import type { PaginationParams, PaginatedResponse } from '@/types/pagination.types';
import type {
  Clinic,
  CreateClinicPayload,
  UpdateClinicPayload,
} from '@/views/clinics/types';

export const fetchClinicsPaginatedThunk = createAsyncThunk<
  PaginatedResponse<Clinic>,
  PaginationParams,
  { rejectValue: string }
>('clinics/fetchAllPaginated', async (params, { rejectWithValue }) => {
  try {
    return await clinicsService.findAllPaginated(params);
  } catch (err) {
    return rejectWithValue(extractThunkError(err, 'Error al cargar sedes'));
  }
});

export const createClinicThunk = createAsyncThunk<
  Clinic,
  CreateClinicPayload,
  { rejectValue: string }
>('clinics/create', async (payload, { rejectWithValue }) => {
  try {
    return await clinicsService.create(payload);
  } catch (err) {
    return rejectWithValue(extractThunkError(err, 'Error al crear la sede'));
  }
});

export const updateClinicThunk = createAsyncThunk<
  Clinic,
  { id: number; payload: UpdateClinicPayload },
  { rejectValue: string }
>('clinics/update', async ({ id, payload }, { rejectWithValue }) => {
  try {
    return await clinicsService.update(id, payload);
  } catch (err) {
    return rejectWithValue(extractThunkError(err, 'Error al actualizar la sede'));
  }
});

export const deleteClinicThunk = createAsyncThunk<
  number,
  number,
  { rejectValue: string }
>('clinics/delete', async (id, { rejectWithValue }) => {
  try {
    await clinicsService.delete(id);
    return id;
  } catch (err) {
    return rejectWithValue(extractThunkError(err, 'Error al eliminar la sede'));
  }
});
