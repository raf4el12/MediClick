import { api } from '@/libs/axios';
import type {
  AuthResponse,
  LoginRequest,
  LogoutRequest,
  RefreshTokenRequest,
  RegisterPatientRequest,
} from '@/types/auth.types';
import type { ProfileResponse, UpdateProfileData } from '@/types/profile.types';

export interface SessionInfo {
  deviceId: string;
  createdAt: number;
  isCurrent: boolean;
}

export const authService = {
  async login(data: LoginRequest): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/login', data);
    return response.data;
  },

  async register(data: RegisterPatientRequest): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/register', data);
    return response.data;
  },

  async checkEmail(email: string): Promise<{ available: boolean }> {
    const response = await api.post<{ available: boolean }>('/auth/check-email', { email });
    return response.data;
  },

  async checkDocument(typeDocument: string, numberDocument: string): Promise<{ available: boolean }> {
    const response = await api.post<{ available: boolean }>('/auth/check-document', { typeDocument, numberDocument });
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

  async changePassword(currentPassword: string, newPassword: string): Promise<{ message: string }> {
    const response = await api.patch<{ message: string }>('/auth/change-password', {
      currentPassword,
      newPassword,
    });
    return response.data;
  },

  async getSessions(deviceId: string): Promise<SessionInfo[]> {
    const response = await api.get<SessionInfo[]>('/auth/sessions', {
      headers: { 'x-device-id': deviceId },
    });
    return response.data;
  },

  async logoutDevice(deviceId: string): Promise<void> {
    await api.post('/auth/logout', { deviceId });
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
