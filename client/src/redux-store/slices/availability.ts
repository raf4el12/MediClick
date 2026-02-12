import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { PaginatedResponse } from '@/types/pagination.types';
import type { Availability } from '@/views/availability/types';
import type { Doctor } from '@/views/doctors/types';
import {
  fetchAvailabilityThunk,
  fetchAvailabilityDoctorsThunk,
  deleteAvailabilityThunk,
} from '../thunks/availability.thunks';

interface PaginationValues {
  searchValue: string;
  currentPage: number;
  pageSize: number;
  orderBy: string;
  orderByMode: 'asc' | 'desc';
  totalPages: number;
  doctorId?: number;
}

interface AvailabilityState {
  data: PaginatedResponse<Availability>;
  doctors: Doctor[];
  loading: boolean;
  error: string | null;
  pagination: PaginationValues;
}

const initialState: AvailabilityState = {
  data: {
    totalRows: 0,
    rows: [],
    totalPages: 0,
    currentPage: 1,
  },
  doctors: [],
  loading: false,
  error: null,
  pagination: {
    searchValue: '',
    currentPage: 1,
    pageSize: 50,
    orderBy: 'id',
    orderByMode: 'desc',
    totalPages: 0,
  },
};

export const availabilitySlice = createSlice({
  name: 'availability',
  initialState,
  reducers: {
    setAvailabilityPagination(state, action: PayloadAction<Partial<PaginationValues>>) {
      state.pagination = { ...state.pagination, ...action.payload };
    },
    clearAvailabilityError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAvailabilityThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAvailabilityThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload;
        state.pagination.totalPages = action.payload.totalPages;
      })
      .addCase(fetchAvailabilityThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? 'Error al cargar disponibilidad';
      })
      .addCase(fetchAvailabilityDoctorsThunk.fulfilled, (state, action) => {
        state.doctors = action.payload;
      })
      .addCase(deleteAvailabilityThunk.rejected, (state, action) => {
        state.error = action.payload ?? 'Error al eliminar disponibilidad';
      });
  },
});

export const { setAvailabilityPagination, clearAvailabilityError } =
  availabilitySlice.actions;

// Selectors
export const selectAvailabilityData = (state: { availability: AvailabilityState }) =>
  state.availability.data;
export const selectAvailabilityDoctors = (state: { availability: AvailabilityState }) =>
  state.availability.doctors;
export const selectAvailabilityLoading = (state: { availability: AvailabilityState }) =>
  state.availability.loading;
export const selectAvailabilityError = (state: { availability: AvailabilityState }) =>
  state.availability.error;
export const selectAvailabilityPagination = (state: { availability: AvailabilityState }) =>
  state.availability.pagination;
