import { createAsyncThunk } from '@reduxjs/toolkit';
import { usersService } from '@/services/users.service';
import { extractThunkError } from '@/utils/extractThunkError';
import type { PaginationParams, PaginatedResponse } from '@/types/pagination.types';
import type { User, CreateUserPayload, UpdateUserPayload } from '@/views/users/types';

interface FetchUsersParams {
  pagination: PaginationParams;
  role?: string;
}

export const fetchUsersThunk = createAsyncThunk<
  PaginatedResponse<User>,
  FetchUsersParams,
  { rejectValue: string }
>('users/fetchAll', async ({ pagination, role }, { rejectWithValue }) => {
  try {
    return await usersService.findAllPaginated(pagination, role);
  } catch (err) {
    return rejectWithValue(extractThunkError(err, 'Error al cargar usuarios'));
  }
});

export const createUserThunk = createAsyncThunk<
  User,
  CreateUserPayload,
  { rejectValue: string }
>('users/create', async (payload, { rejectWithValue }) => {
  try {
    return await usersService.createInternal(payload);
  } catch (err) {
    return rejectWithValue(extractThunkError(err, 'Error al crear usuario'));
  }
});

export const updateUserThunk = createAsyncThunk<
  User,
  { id: number; payload: UpdateUserPayload },
  { rejectValue: string }
>('users/update', async ({ id, payload }, { rejectWithValue }) => {
  try {
    return await usersService.update(id, payload);
  } catch (err) {
    return rejectWithValue(extractThunkError(err, 'Error al actualizar usuario'));
  }
});

export const deleteUserThunk = createAsyncThunk<
  number,
  number,
  { rejectValue: string }
>('users/delete', async (id, { rejectWithValue }) => {
  try {
    await usersService.remove(id);
    return id;
  } catch (err) {
    return rejectWithValue(extractThunkError(err, 'Error al eliminar usuario'));
  }
});
