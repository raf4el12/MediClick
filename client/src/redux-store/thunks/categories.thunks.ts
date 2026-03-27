import { createAsyncThunk } from '@reduxjs/toolkit';
import { categoriesService } from '@/services/categories.service';
import { extractThunkError } from '@/utils/extractThunkError';
import type { PaginationParams, PaginatedResponse } from '@/types/pagination.types';
import type {
  Category,
  CreateCategoryPayload,
  UpdateCategoryPayload,
} from '@/views/categories/types';

export const fetchCategoriesPaginatedThunk = createAsyncThunk<
  PaginatedResponse<Category>,
  PaginationParams,
  { rejectValue: string }
>('categories/fetchAllPaginated', async (params, { rejectWithValue }) => {
  try {
    return await categoriesService.findAllPaginated(params);
  } catch (err) {
    return rejectWithValue(extractThunkError(err, 'Error al cargar categorías'));
  }
});

export const createCategoryThunk = createAsyncThunk<
  Category,
  CreateCategoryPayload,
  { rejectValue: string }
>('categories/create', async (payload, { rejectWithValue }) => {
  try {
    return await categoriesService.create(payload);
  } catch (err) {
    return rejectWithValue(extractThunkError(err, 'Error al crear la categoría'));
  }
});

export const updateCategoryThunk = createAsyncThunk<
  Category,
  { id: number; payload: UpdateCategoryPayload },
  { rejectValue: string }
>('categories/update', async ({ id, payload }, { rejectWithValue }) => {
  try {
    return await categoriesService.update(id, payload);
  } catch (err) {
    return rejectWithValue(extractThunkError(err, 'Error al actualizar la categoría'));
  }
});

export const deleteCategoryThunk = createAsyncThunk<
  number,
  number,
  { rejectValue: string }
>('categories/delete', async (id, { rejectWithValue }) => {
  try {
    await categoriesService.delete(id);
    return id;
  } catch (err) {
    return rejectWithValue(extractThunkError(err, 'Error al eliminar la categoría'));
  }
});
