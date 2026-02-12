import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { PaginatedResponse } from '@/types/pagination.types';
import type { Specialty, Category } from '@/views/specialties/types';
import {
  fetchSpecialtiesThunk,
  fetchCategoriesThunk,
  deleteSpecialtyThunk,
} from '../thunks/specialties.thunks';

interface PaginationValues {
  searchValue: string;
  currentPage: number;
  pageSize: number;
  orderBy: string;
  orderByMode: 'asc' | 'desc';
  totalPages: number;
  categoryId?: number;
}

interface SpecialtiesState {
  data: PaginatedResponse<Specialty>;
  categories: Category[];
  loading: boolean;
  error: string | null;
  pagination: PaginationValues;
}

const initialState: SpecialtiesState = {
  data: {
    totalRows: 0,
    rows: [],
    totalPages: 0,
    currentPage: 1,
  },
  categories: [],
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

export const specialtiesSlice = createSlice({
  name: 'specialties',
  initialState,
  reducers: {
    setPagination(state, action: PayloadAction<Partial<PaginationValues>>) {
      state.pagination = { ...state.pagination, ...action.payload };
    },
    clearError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch specialties
      .addCase(fetchSpecialtiesThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSpecialtiesThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload;
        state.pagination.totalPages = action.payload.totalPages;
      })
      .addCase(fetchSpecialtiesThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? 'Error al cargar especialidades';
      })
      // Fetch categories
      .addCase(fetchCategoriesThunk.fulfilled, (state, action) => {
        state.categories = action.payload;
      })
      // Delete specialty
      .addCase(deleteSpecialtyThunk.rejected, (state, action) => {
        state.error = action.payload ?? 'Error al eliminar la especialidad';
      });
  },
});

export const { setPagination, clearError } = specialtiesSlice.actions;

// Selectors
export const selectSpecialtiesData = (state: { specialties: SpecialtiesState }) =>
  state.specialties.data;
export const selectCategories = (state: { specialties: SpecialtiesState }) =>
  state.specialties.categories;
export const selectSpecialtiesLoading = (state: { specialties: SpecialtiesState }) =>
  state.specialties.loading;
export const selectSpecialtiesError = (state: { specialties: SpecialtiesState }) =>
  state.specialties.error;
export const selectSpecialtiesPagination = (state: { specialties: SpecialtiesState }) =>
  state.specialties.pagination;
