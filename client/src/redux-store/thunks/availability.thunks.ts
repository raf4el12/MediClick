import { createAsyncThunk } from '@reduxjs/toolkit';
import { availabilityService } from '@/services/availability.service';
import { doctorsService } from '@/services/doctors.service';
import { extractThunkError } from '@/utils/extractThunkError';
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
    return rejectWithValue(extractThunkError(err, 'Error al cargar disponibilidad'));
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
    return rejectWithValue(extractThunkError(err, 'Error al cargar doctores'));
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
    return rejectWithValue(extractThunkError(err, 'Error al crear disponibilidad'));
  }
});

interface BulkSaveAvailabilityParams {
  doctorId: number;
  specialtyId: number;
  entries: Array<{
    startDate: string;
    endDate: string;
    dayOfWeek: string;
    timeFrom: string;
    timeTo: string;
    type: string;
    reason?: string;
  }>;
}

export const bulkSaveAvailabilityThunk = createAsyncThunk<
  Availability[],
  BulkSaveAvailabilityParams,
  { rejectValue: string }
>('availability/bulkSave', async (payload, { rejectWithValue }) => {
  try {
    return await availabilityService.bulkSave(payload);
  } catch (err) {
    return rejectWithValue(extractThunkError(err, 'Error al guardar disponibilidad'));
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
    return rejectWithValue(extractThunkError(err, 'Error al actualizar disponibilidad'));
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
    return rejectWithValue(extractThunkError(err, 'Error al eliminar disponibilidad'));
  }
});
