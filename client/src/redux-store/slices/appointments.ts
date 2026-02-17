import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { PaginatedResponse } from '@/types/pagination.types';
import type { Appointment, AppointmentFilters } from '@/views/appointments/types';
import { fetchAppointmentsThunk } from '../thunks/appointments.thunks';

interface PaginationValues {
  searchValue: string;
  currentPage: number;
  pageSize: number;
  orderBy: string;
  orderByMode: 'asc' | 'desc';
  totalPages: number;
}

interface AppointmentsState {
  data: PaginatedResponse<Appointment>;
  loading: boolean;
  error: string | null;
  pagination: PaginationValues;
  filters: AppointmentFilters;
}

const initialState: AppointmentsState = {
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
  filters: {},
};

export const appointmentsSlice = createSlice({
  name: 'appointments',
  initialState,
  reducers: {
    setAppointmentsPagination(state, action: PayloadAction<Partial<PaginationValues>>) {
      state.pagination = { ...state.pagination, ...action.payload };
    },
    setAppointmentsFilters(state, action: PayloadAction<Partial<AppointmentFilters>>) {
      state.filters = { ...state.filters, ...action.payload };
      state.pagination.currentPage = 1;
    },
    clearAppointmentsError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAppointmentsThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAppointmentsThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload;
        state.pagination.totalPages = action.payload.totalPages;
      })
      .addCase(fetchAppointmentsThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? 'Error al cargar citas';
      });
  },
});

export const {
  setAppointmentsPagination,
  setAppointmentsFilters,
  clearAppointmentsError,
} = appointmentsSlice.actions;

export const selectAppointmentsData = (state: { appointments: AppointmentsState }) =>
  state.appointments.data;
export const selectAppointmentsLoading = (state: { appointments: AppointmentsState }) =>
  state.appointments.loading;
export const selectAppointmentsError = (state: { appointments: AppointmentsState }) =>
  state.appointments.error;
export const selectAppointmentsPagination = (state: { appointments: AppointmentsState }) =>
  state.appointments.pagination;
export const selectAppointmentsFilters = (state: { appointments: AppointmentsState }) =>
  state.appointments.filters;
