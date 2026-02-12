import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { PaginatedResponse } from '@/types/pagination.types';
import type { Category } from '@/views/categories/types';
import {
  fetchCategoriesPaginatedThunk,
  deleteCategoryThunk,
} from '../thunks/categories.thunks';

interface PaginationValues {
  searchValue: string;
  currentPage: number;
  pageSize: number;
  orderBy: string;
  orderByMode: 'asc' | 'desc';
  totalPages: number;
}

interface CategoriesState {
  data: PaginatedResponse<Category>;
  loading: boolean;
  error: string | null;
  pagination: PaginationValues;
}

const initialState: CategoriesState = {
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

export const categoriesSlice = createSlice({
  name: 'categories',
  initialState,
  reducers: {
    setCategoriesPagination(state, action: PayloadAction<Partial<PaginationValues>>) {
      state.pagination = { ...state.pagination, ...action.payload };
    },
    clearCategoriesError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCategoriesPaginatedThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCategoriesPaginatedThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload;
        state.pagination.totalPages = action.payload.totalPages;
      })
      .addCase(fetchCategoriesPaginatedThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? 'Error al cargar categorías';
      })
      .addCase(deleteCategoryThunk.rejected, (state, action) => {
        state.error = action.payload ?? 'Error al eliminar la categoría';
      });
  },
});

export const { setCategoriesPagination, clearCategoriesError } = categoriesSlice.actions;

// Selectors
export const selectCategoriesData = (state: { categories: CategoriesState }) =>
  state.categories.data;
export const selectCategoriesLoading = (state: { categories: CategoriesState }) =>
  state.categories.loading;
export const selectCategoriesError = (state: { categories: CategoriesState }) =>
  state.categories.error;
export const selectCategoriesPagination = (state: { categories: CategoriesState }) =>
  state.categories.pagination;
