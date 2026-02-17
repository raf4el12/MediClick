import { createAsyncThunk } from '@reduxjs/toolkit';
import { AxiosError } from 'axios';
import { appointmentsService } from '@/services/appointments.service';
import type { ApiErrorResponse } from '@/types/auth.types';
import type { PaginationParams, PaginatedResponse } from '@/types/pagination.types';
import type {
  Appointment,
  AppointmentFilters,
  CreateAppointmentPayload,
} from '@/views/appointments/types';

interface FetchAppointmentsArgs {
  pagination: PaginationParams;
  filters?: AppointmentFilters;
}

export const fetchAppointmentsThunk = createAsyncThunk<
  PaginatedResponse<Appointment>,
  FetchAppointmentsArgs,
  { rejectValue: string }
>('appointments/fetchAll', async ({ pagination, filters }, { rejectWithValue }) => {
  try {
    return await appointmentsService.findAllPaginated(pagination, filters);
  } catch (err) {
    const error = err as AxiosError<ApiErrorResponse>;
    const message = error.response?.data?.message;
    const errorText = Array.isArray(message) ? message[0] : message;
    return rejectWithValue(errorText ?? 'Error al cargar citas');
  }
});

export const createAppointmentThunk = createAsyncThunk<
  Appointment,
  CreateAppointmentPayload,
  { rejectValue: string }
>('appointments/create', async (payload, { rejectWithValue }) => {
  try {
    return await appointmentsService.create(payload);
  } catch (err) {
    const error = err as AxiosError<ApiErrorResponse>;
    const message = error.response?.data?.message;
    const errorText = Array.isArray(message) ? message[0] : message;
    return rejectWithValue(errorText ?? 'Error al crear la cita');
  }
});
