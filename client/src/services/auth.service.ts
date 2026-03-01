import { api } from '@/libs/axios';
import type {
  AuthResponse,
  LoginRequest,
  LogoutRequest,
  RefreshTokenRequest,
} from '@/types/auth.types';
import type { ProfileResponse, UpdateProfileData } from '@/types/profile.types';

export const authService = {
  async login(data: LoginRequest): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/login', data);
    return response.data;
  },

  async refreshToken(data: RefreshTokenRequest): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>(
      '/auth/refresh-token',
      data,
    );
    return response.data;
  },

  async logout(data: LogoutRequest): Promise<void> {
    await api.post('/auth/logout', data);
  },

  async logoutAllDevices(): Promise<void> {
    await api.post('/auth/logout-all');
  },

  async getProfile(): Promise<ProfileResponse> {
    const response = await api.get<ProfileResponse>('/auth/me');
    return response.data;
  },

  async updateProfile(data: UpdateProfileData): Promise<ProfileResponse> {
    const response = await api.patch<ProfileResponse>('/auth/profile', data);
    return response.data;
  },
};
