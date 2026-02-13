import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { PaginatedResponse } from '@/types/pagination.types';
import type { Patient } from '@/views/patients/types';
import { fetchPatientsThunk } from '../thunks/patients.thunks';

interface PaginationValues {
  searchValue: string;
  currentPage: number;
  pageSize: number;
  orderBy: string;
  orderByMode: 'asc' | 'desc';
  totalPages: number;
  statusFilter: 'all' | 'active' | 'inactive';
}

interface PatientsState {
  data: PaginatedResponse<Patient>;
  loading: boolean;
  error: string | null;
  pagination: PaginationValues;
}

const initialState: PatientsState = {
  data: {
    totalRows: 0,
    rows: [],
    totalPages: 0,
    currentPage: 1,
    activeCount: 0,
    inactiveCount: 0,
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
    statusFilter: 'all',
  },
};

export const patientsSlice = createSlice({
  name: 'patients',
  initialState,
  reducers: {
    setPatientsPagination(state, action: PayloadAction<Partial<PaginationValues>>) {
      state.pagination = { ...state.pagination, ...action.payload };
    },
    clearPatientsError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPatientsThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPatientsThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload;
        state.pagination.totalPages = action.payload.totalPages;
      })
      .addCase(fetchPatientsThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? 'Error al cargar pacientes';
      });
  },
});

export const { setPatientsPagination, clearPatientsError } = patientsSlice.actions;

export const selectPatientsData = (state: { patients: PatientsState }) =>
  state.patients.data;
export const selectPatientsLoading = (state: { patients: PatientsState }) =>
  state.patients.loading;
export const selectPatientsError = (state: { patients: PatientsState }) =>
  state.patients.error;
export const selectPatientsPagination = (state: { patients: PatientsState }) =>
  state.patients.pagination;
