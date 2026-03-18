import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { PaginatedResponse } from '@/types/pagination.types';
import type { Clinic } from '@/views/clinics/types';
import {
  fetchClinicsPaginatedThunk,
  deleteClinicThunk,
} from '../thunks/clinics.thunks';

interface PaginationValues {
  searchValue: string;
  currentPage: number;
  pageSize: number;
  orderBy: string;
  orderByMode: 'asc' | 'desc';
  totalPages: number;
}

interface ClinicsState {
  data: PaginatedResponse<Clinic>;
  loading: boolean;
  error: string | null;
  pagination: PaginationValues;
}

const initialState: ClinicsState = {
  data: {
    totalRows: 0,
    rows: [],
    totalPages: 0,
    currentPage: 1,
  },
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

export const clinicsSlice = createSlice({
  name: 'clinics',
  initialState,
  reducers: {
    setClinicsPagination(state, action: PayloadAction<Partial<PaginationValues>>) {
      state.pagination = { ...state.pagination, ...action.payload };
    },
    clearClinicsError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchClinicsPaginatedThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchClinicsPaginatedThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload;
        state.pagination.totalPages = action.payload.totalPages;
      })
      .addCase(fetchClinicsPaginatedThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? 'Error al cargar sedes';
      })
      .addCase(deleteClinicThunk.rejected, (state, action) => {
        state.error = action.payload ?? 'Error al eliminar la sede';
      });
  },
});

export const { setClinicsPagination, clearClinicsError } = clinicsSlice.actions;

export const selectClinicsData = (state: { clinics: ClinicsState }) =>
  state.clinics.data;
export const selectClinicsLoading = (state: { clinics: ClinicsState }) =>
  state.clinics.loading;
export const selectClinicsError = (state: { clinics: ClinicsState }) =>
  state.clinics.error;
export const selectClinicsPagination = (state: { clinics: ClinicsState }) =>
  state.clinics.pagination;
