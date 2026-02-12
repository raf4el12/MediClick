import { createAsyncThunk } from '@reduxjs/toolkit';
import { AxiosError } from 'axios';
import { schedulesService } from '@/services/schedules.service';
import { doctorsService } from '@/services/doctors.service';
import type { ApiErrorResponse } from '@/types/auth.types';
import type { PaginationParams, PaginatedResponse } from '@/types/pagination.types';
import type {
  Schedule,
  ScheduleFilters,
  GenerateSchedulesPayload,
  GenerateSchedulesResponse,
} from '@/views/schedules/types';
import type { Doctor } from '@/views/doctors/types';

interface FetchSchedulesParams {
  pagination: PaginationParams;
  filters?: ScheduleFilters;
}

export const fetchSchedulesThunk = createAsyncThunk<
  PaginatedResponse<Schedule>,
  FetchSchedulesParams,
  { rejectValue: string }
>('schedules/fetchAll', async ({ pagination, filters }, { rejectWithValue }) => {
  try {
    return await schedulesService.findAllPaginated(pagination, filters);
  } catch (err) {
    const error = err as AxiosError<ApiErrorResponse>;
    const message = error.response?.data?.message;
    const errorText = Array.isArray(message) ? message[0] : message;
    return rejectWithValue(errorText ?? 'Error al cargar horarios');
  }
});

export const fetchSchedulesDoctorsThunk = createAsyncThunk<
  Doctor[],
  void,
  { rejectValue: string }
>('schedules/fetchDoctors', async (_, { rejectWithValue }) => {
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

export const generateSchedulesThunk = createAsyncThunk<
  GenerateSchedulesResponse,
  GenerateSchedulesPayload,
  { rejectValue: string }
>('schedules/generate', async (payload, { rejectWithValue }) => {
  try {
    return await schedulesService.generate(payload);
  } catch (err) {
    const error = err as AxiosError<ApiErrorResponse>;
    const message = error.response?.data?.message;
    const errorText = Array.isArray(message) ? message[0] : message;
    return rejectWithValue(errorText ?? 'Error al generar horarios');
  }
});
