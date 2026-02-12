import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { PaginatedResponse } from '@/types/pagination.types';
import type { Doctor } from '@/views/doctors/types';
import type { Specialty } from '@/views/specialties/types';
import {
  fetchDoctorsThunk,
  fetchDoctorSpecialtiesThunk,
} from '../thunks/doctors.thunks';

interface PaginationValues {
  searchValue: string;
  currentPage: number;
  pageSize: number;
  orderBy: string;
  orderByMode: 'asc' | 'desc';
  totalPages: number;
  specialtyId?: number;
}

interface DoctorsState {
  data: PaginatedResponse<Doctor>;
  specialties: Specialty[];
  loading: boolean;
  error: string | null;
  pagination: PaginationValues;
}

const initialState: DoctorsState = {
  data: {
    totalRows: 0,
    rows: [],
    totalPages: 0,
    currentPage: 1,
  },
  specialties: [],
  loading: false,
  error: null,
  pagination: {
    searchValue: '',
    currentPage: 1,
    pageSize: 8,
    orderBy: 'id',
    orderByMode: 'desc',
    totalPages: 0,
  },
};

export const doctorsSlice = createSlice({
  name: 'doctors',
  initialState,
  reducers: {
    setDoctorsPagination(state, action: PayloadAction<Partial<PaginationValues>>) {
      state.pagination = { ...state.pagination, ...action.payload };
    },
    clearDoctorsError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDoctorsThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDoctorsThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload;
        state.pagination.totalPages = action.payload.totalPages;
      })
      .addCase(fetchDoctorsThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? 'Error al cargar doctores';
      })
      .addCase(fetchDoctorSpecialtiesThunk.fulfilled, (state, action) => {
        state.specialties = action.payload;
      });
  },
});

export const { setDoctorsPagination, clearDoctorsError } = doctorsSlice.actions;

// Selectors
export const selectDoctorsData = (state: { doctors: DoctorsState }) =>
  state.doctors.data;
export const selectDoctorSpecialties = (state: { doctors: DoctorsState }) =>
  state.doctors.specialties;
export const selectDoctorsLoading = (state: { doctors: DoctorsState }) =>
  state.doctors.loading;
export const selectDoctorsError = (state: { doctors: DoctorsState }) =>
  state.doctors.error;
export const selectDoctorsPagination = (state: { doctors: DoctorsState }) =>
  state.doctors.pagination;
