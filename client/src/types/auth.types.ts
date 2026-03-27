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
  clinicName?: string | null;
  clinicTimezone?: string | null;
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

export interface RegisterPatientRequest {
  typeDocument: string;
  numberDocument: string;
  name: string;
  lastName: string;
  email: string;
  phone: string;
  birthday?: string;
  gender?: string;
  password: string;
}

export interface ApiErrorResponse {
  statusCode: number;
  message: string | string[];
  error?: string;
}
