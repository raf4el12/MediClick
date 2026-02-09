import { createAsyncThunk } from '@reduxjs/toolkit';
import { AxiosError } from 'axios';
import { authService } from '@/services/auth.service';
import type { AuthResponse, ApiErrorResponse } from '@/types/auth.types';
import { getDeviceId } from '@/utils/device-id';

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
    const error = err as AxiosError<ApiErrorResponse>;
    const message = error.response?.data?.message;
    const errorText = Array.isArray(message) ? message[0] : message;
    return rejectWithValue(errorText ?? 'Error al iniciar sesión');
  }
});

export const logoutThunk = createAsyncThunk<void, void, { rejectValue: string }>(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      await authService.logout({ deviceId: getDeviceId() });
    } catch (err) {
      const error = err as AxiosError<ApiErrorResponse>;
      return rejectWithValue(
        (error.response?.data?.message as string) ?? 'Error al cerrar sesión',
      );
    }
  },
);
