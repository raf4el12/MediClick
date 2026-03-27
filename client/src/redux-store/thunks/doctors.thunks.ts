import { createAsyncThunk } from '@reduxjs/toolkit';
import { doctorsService } from '@/services/doctors.service';
import { specialtiesService } from '@/services/specialties.service';
import { extractThunkError } from '@/utils/extractThunkError';
import type { PaginationParams, PaginatedResponse } from '@/types/pagination.types';
import type { Doctor, OnboardDoctorPayload } from '@/views/doctors/types';
import type { Specialty } from '@/views/specialties/types';

interface FetchDoctorsParams {
  pagination: PaginationParams;
  specialtyId?: number;
}

export const fetchDoctorsThunk = createAsyncThunk<
  PaginatedResponse<Doctor>,
  FetchDoctorsParams,
  { rejectValue: string }
>('doctors/fetchAll', async ({ pagination, specialtyId }, { rejectWithValue }) => {
  try {
    return await doctorsService.findAllPaginated(pagination, specialtyId);
  } catch (err) {
    return rejectWithValue(extractThunkError(err, 'Error al cargar doctores'));
  }
});

export const fetchDoctorSpecialtiesThunk = createAsyncThunk<
  Specialty[],
  void,
  { rejectValue: string }
>('doctors/fetchSpecialties', async (_, { rejectWithValue }) => {
  try {
    const result = await specialtiesService.findAllPaginated({
      pageSize: 100,
      currentPage: 1,
    });
    return result.rows;
  } catch (err) {
    return rejectWithValue(extractThunkError(err, 'Error al cargar especialidades'));
  }
});

export const onboardDoctorThunk = createAsyncThunk<
  Doctor,
  OnboardDoctorPayload,
  { rejectValue: string }
>('doctors/onboard', async (payload, { rejectWithValue }) => {
  try {
    return await doctorsService.onboard(payload);
  } catch (err) {
    return rejectWithValue(extractThunkError(err, 'Error al registrar el doctor'));
  }
});
