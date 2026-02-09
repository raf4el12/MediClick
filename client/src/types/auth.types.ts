export enum UserRole {
  ADMIN = 'ADMIN',
  DOCTOR = 'DOCTOR',
  RECEPTIONIST = 'RECEPTIONIST',
  PATIENT = 'PATIENT',
}

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
  deviceId: string;
}

export interface LogoutRequest {
  deviceId: string;
}

export interface RefreshTokenRequest {
  deviceId: string;
}

export interface AuthResponse {
  accessToken: string;
  user: AuthUser;
}

export interface ApiErrorResponse {
  statusCode: number;
  message: string | string[];
  error?: string;
}
