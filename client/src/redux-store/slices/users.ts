import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { PaginatedResponse } from '@/types/pagination.types';
import type { User } from '@/views/users/types';
import {
  fetchUsersThunk,
  createUserThunk,
  updateUserThunk,
  deleteUserThunk,
} from '../thunks/users.thunks';

interface PaginationValues {
  searchValue: string;
  currentPage: number;
  pageSize: number;
  orderBy: string;
  orderByMode: 'asc' | 'desc';
  totalPages: number;
  role?: string;
}

interface UsersState {
  data: PaginatedResponse<User>;
  loading: boolean;
  error: string | null;
  pagination: PaginationValues;
}

const initialState: UsersState = {
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

export const usersSlice = createSlice({
  name: 'users',
  initialState,
  reducers: {
    setUsersPagination(state, action: PayloadAction<Partial<PaginationValues>>) {
      state.pagination = { ...state.pagination, ...action.payload };
    },
    clearUsersError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUsersThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUsersThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload;
        state.pagination.totalPages = action.payload.totalPages;
      })
      .addCase(fetchUsersThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? 'Error al cargar usuarios';
      })
      .addCase(createUserThunk.rejected, (state, action) => {
        state.error = action.payload ?? 'Error al crear usuario';
      })
      .addCase(updateUserThunk.rejected, (state, action) => {
        state.error = action.payload ?? 'Error al actualizar usuario';
      })
      .addCase(deleteUserThunk.rejected, (state, action) => {
        state.error = action.payload ?? 'Error al eliminar usuario';
      });
  },
});

export const { setUsersPagination, clearUsersError } = usersSlice.actions;

export const selectUsersData = (state: { users: UsersState }) =>
  state.users.data;
export const selectUsersLoading = (state: { users: UsersState }) =>
  state.users.loading;
export const selectUsersError = (state: { users: UsersState }) =>
  state.users.error;
export const selectUsersPagination = (state: { users: UsersState }) =>
  state.users.pagination;
