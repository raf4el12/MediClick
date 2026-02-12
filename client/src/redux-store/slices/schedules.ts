import { createSlice } from '@reduxjs/toolkit';
import type { PaginatedResponse } from '@/types/pagination.types';
import type { Schedule, GenerateSchedulesResponse } from '@/views/schedules/types';
import type { Doctor } from '@/views/doctors/types';
import {
  fetchSchedulesThunk,
  fetchSchedulesDoctorsThunk,
  generateSchedulesThunk,
} from '../thunks/schedules.thunks';

interface SchedulesState {
  data: PaginatedResponse<Schedule>;
  doctors: Doctor[];
  loading: boolean;
  generating: boolean;
  generateResult: GenerateSchedulesResponse | null;
  error: string | null;
}

const initialState: SchedulesState = {
  data: {
    totalRows: 0,
    rows: [],
    totalPages: 0,
    currentPage: 1,
  },
  doctors: [],
  loading: false,
  generating: false,
  generateResult: null,
  error: null,
};

export const schedulesSlice = createSlice({
  name: 'schedules',
  initialState,
  reducers: {
    clearSchedulesError(state) {
      state.error = null;
    },
    clearGenerateResult(state) {
      state.generateResult = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSchedulesThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSchedulesThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload;
      })
      .addCase(fetchSchedulesThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? 'Error al cargar horarios';
      })
      .addCase(fetchSchedulesDoctorsThunk.fulfilled, (state, action) => {
        state.doctors = action.payload;
      })
      .addCase(generateSchedulesThunk.pending, (state) => {
        state.generating = true;
        state.error = null;
        state.generateResult = null;
      })
      .addCase(generateSchedulesThunk.fulfilled, (state, action) => {
        state.generating = false;
        state.generateResult = action.payload;
      })
      .addCase(generateSchedulesThunk.rejected, (state, action) => {
        state.generating = false;
        state.error = action.payload ?? 'Error al generar horarios';
      });
  },
});

export const { clearSchedulesError, clearGenerateResult } = schedulesSlice.actions;

// Selectors
export const selectSchedulesData = (state: { schedules: SchedulesState }) =>
  state.schedules.data;
export const selectSchedulesDoctors = (state: { schedules: SchedulesState }) =>
  state.schedules.doctors;
export const selectSchedulesLoading = (state: { schedules: SchedulesState }) =>
  state.schedules.loading;
export const selectSchedulesGenerating = (state: { schedules: SchedulesState }) =>
  state.schedules.generating;
export const selectSchedulesGenerateResult = (state: { schedules: SchedulesState }) =>
  state.schedules.generateResult;
export const selectSchedulesError = (state: { schedules: SchedulesState }) =>
  state.schedules.error;
