import { createAsyncThunk } from '@reduxjs/toolkit';
import { AxiosError } from 'axios';
import { availabilityService } from '@/services/availability.service';
import { doctorsService } from '@/services/doctors.service';
import type { ApiErrorResponse } from '@/types/auth.types';
import type { PaginationParams, PaginatedResponse } from '@/types/pagination.types';
import type {
  Availability,
  CreateAvailabilityPayload,
  UpdateAvailabilityPayload,
} from '@/views/availability/types';
import type { Doctor } from '@/views/doctors/types';

interface FetchAvailabilityParams {
  pagination: PaginationParams;
  doctorId?: number;
}

export const fetchAvailabilityThunk = createAsyncThunk<
  PaginatedResponse<Availability>,
  FetchAvailabilityParams,
  { rejectValue: string }
>('availability/fetchAll', async ({ pagination, doctorId }, { rejectWithValue }) => {
  try {
    return await availabilityService.findAllPaginated(pagination, doctorId);
  } catch (err) {
    const error = err as AxiosError<ApiErrorResponse>;
    const message = error.response?.data?.message;
    const errorText = Array.isArray(message) ? message[0] : message;
    return rejectWithValue(errorText ?? 'Error al cargar disponibilidad');
  }
});

export const fetchAvailabilityDoctorsThunk = createAsyncThunk<
  Doctor[],
  void,
  { rejectValue: string }
>('availability/fetchDoctors', async (_, { rejectWithValue }) => {
  try {
    const result = await doctorsService.findAllPaginated({
      pageSize: 100,
      currentPage: 1,
    });
    return result.rows;
  } catch (err) {
    const error = err as AxiosError<ApiErrorResponse>;
    const message = error.response?.data?.message;
    const errorText = Array.isArray(message) ? message[0] : message;
    return rejectWithValue(errorText ?? 'Error al cargar doctores');
  }
});

export const createAvailabilityThunk = createAsyncThunk<
  Availability,
  CreateAvailabilityPayload,
  { rejectValue: string }
>('availability/create', async (payload, { rejectWithValue }) => {
  try {
    return await availabilityService.create(payload);
  } catch (err) {
    const error = err as AxiosError<ApiErrorResponse>;
    const message = error.response?.data?.message;
    const errorText = Array.isArray(message) ? message[0] : message;
    return rejectWithValue(errorText ?? 'Error al crear disponibilidad');
  }
});

export const createBulkAvailabilityThunk = createAsyncThunk<
  Availability[],
  CreateAvailabilityPayload[],
  { rejectValue: string }
>('availability/createBulk', async (payloads, { rejectWithValue }) => {
  try {
    const results = await Promise.all(
      payloads.map((p) => availabilityService.create(p)),
    );
    return results;
  } catch (err) {
    const error = err as AxiosError<ApiErrorResponse>;
    const message = error.response?.data?.message;
    const errorText = Array.isArray(message) ? message[0] : message;
    return rejectWithValue(errorText ?? 'Error al guardar disponibilidad');
  }
});

export const updateAvailabilityThunk = createAsyncThunk<
  Availability,
  { id: number; payload: UpdateAvailabilityPayload },
  { rejectValue: string }
>('availability/update', async ({ id, payload }, { rejectWithValue }) => {
  try {
    return await availabilityService.update(id, payload);
  } catch (err) {
    const error = err as AxiosError<ApiErrorResponse>;
    const message = error.response?.data?.message;
    const errorText = Array.isArray(message) ? message[0] : message;
    return rejectWithValue(errorText ?? 'Error al actualizar disponibilidad');
  }
});

export const deleteAvailabilityThunk = createAsyncThunk<
  number,
  number,
  { rejectValue: string }
>('availability/delete', async (id, { rejectWithValue }) => {
  try {
    await availabilityService.delete(id);
    return id;
  } catch (err) {
    const error = err as AxiosError<ApiErrorResponse>;
    const message = error.response?.data?.message;
    const errorText = Array.isArray(message) ? message[0] : message;
    return rejectWithValue(errorText ?? 'Error al eliminar disponibilidad');
  }
});
