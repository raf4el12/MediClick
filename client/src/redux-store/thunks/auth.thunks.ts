import { createAsyncThunk } from '@reduxjs/toolkit';
import { authService } from '@/services/auth.service';
import type { AuthResponse, RegisterPatientRequest } from '@/types/auth.types';
import { getDeviceId } from '@/utils/device-id';
import { extractThunkError } from '@/utils/extractThunkError';

interface LoginPayload {
  email: string;
  password: string;
}

export const loginThunk = createAsyncThunk<
  AuthResponse,
  LoginPayload,
  { rejectValue: string }
>('auth/login', async (credentials, { rejectWithValue }) => {
  try {
    return await authService.login({
      ...credentials,
      deviceId: getDeviceId(),
    });
  } catch (err) {
    return rejectWithValue(extractThunkError(err, 'Error al iniciar sesión'));
  }
});

export const registerThunk = createAsyncThunk<
  AuthResponse,
  RegisterPatientRequest,
  { rejectValue: string }
>('auth/register', async (data, { rejectWithValue }) => {
  try {
    return await authService.register(data);
  } catch (err) {
    return rejectWithValue(extractThunkError(err, 'Error al registrar'));
  }
});

export const logoutThunk = createAsyncThunk<void, void, { rejectValue: string }>(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      await authService.logout({ deviceId: getDeviceId() });
    } catch (err) {
      return rejectWithValue(extractThunkError(err, 'Error al cerrar sesión'));
    }
  },
);
