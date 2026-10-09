import { createAsyncThunk } from '@reduxjs/toolkit';
import { appointmentsService } from '@/services/appointments.service';
import { extractThunkError } from '@/utils/extractThunkError';
import type { PaginationParams, PaginatedResponse } from '@/types/pagination.types';
import type {
  Appointment,
  AppointmentFilters,
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
    return rejectWithValue(extractThunkError(err, 'Error al cargar citas'));
  }
});

