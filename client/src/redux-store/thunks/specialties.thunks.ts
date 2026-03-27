import { createAsyncThunk } from '@reduxjs/toolkit';
import { specialtiesService } from '@/services/specialties.service';
import { categoriesService } from '@/services/categories.service';
import { extractThunkError } from '@/utils/extractThunkError';
import type { PaginationParams, PaginatedResponse } from '@/types/pagination.types';
import type {
  Specialty,
  CreateSpecialtyPayload,
  UpdateSpecialtyPayload,
  Category,
} from '@/views/specialties/types';

interface FetchSpecialtiesParams {
  pagination: PaginationParams;
  categoryId?: number;
}

export const fetchSpecialtiesThunk = createAsyncThunk<
  PaginatedResponse<Specialty>,
  FetchSpecialtiesParams,
  { rejectValue: string }
>('specialties/fetchAll', async ({ pagination, categoryId }, { rejectWithValue }) => {
  try {
    return await specialtiesService.findAllPaginated(pagination, categoryId);
  } catch (err) {
    return rejectWithValue(extractThunkError(err, 'Error al cargar especialidades'));
  }
});

export const fetchCategoriesThunk = createAsyncThunk<
  Category[],
  void,
  { rejectValue: string }
>('specialties/fetchCategories', async (_, { rejectWithValue }) => {
  try {
    return await categoriesService.findAll();
  } catch (err) {
    return rejectWithValue(extractThunkError(err, 'Error al cargar categorías'));
  }
});

export const createSpecialtyThunk = createAsyncThunk<
  Specialty,
  CreateSpecialtyPayload,
  { rejectValue: string }
>('specialties/create', async (payload, { rejectWithValue }) => {
  try {
    return await specialtiesService.create(payload);
  } catch (err) {
    return rejectWithValue(extractThunkError(err, 'Error al crear la especialidad'));
  }
});

export const updateSpecialtyThunk = createAsyncThunk<
  Specialty,
  { id: number; payload: UpdateSpecialtyPayload },
  { rejectValue: string }
>('specialties/update', async ({ id, payload }, { rejectWithValue }) => {
  try {
    return await specialtiesService.update(id, payload);
  } catch (err) {
    return rejectWithValue(extractThunkError(err, 'Error al actualizar la especialidad'));
  }
});

export const deleteSpecialtyThunk = createAsyncThunk<
  number,
  number,
  { rejectValue: string }
>('specialties/delete', async (id, { rejectWithValue }) => {
  try {
    await specialtiesService.delete(id);
    return id;
  } catch (err) {
    return rejectWithValue(extractThunkError(err, 'Error al eliminar la especialidad'));
  }
});
