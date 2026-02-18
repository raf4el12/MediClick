import axios, {
  type AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from 'axios';
import type { ApiErrorResponse } from '@/types/auth.types';

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
}> = [];

function processQueue(error: unknown): void {
  failedQueue.forEach(({ reject }) => reject(error));
  failedQueue = [];
}

function processQueueSuccess(): void {
  failedQueue.forEach(({ resolve }) => resolve(undefined));
  failedQueue = [];
}

const api: AxiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiErrorResponse>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // Skip refresh for auth endpoints or already retried requests
    if (
      !originalRequest ||
      originalRequest._retry ||
      originalRequest.url?.includes('/auth/login') ||
      originalRequest.url?.includes('/auth/refresh-token')
    ) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401) {
      if (isRefreshing) {
        // Queue the request while refresh is in progress
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(() => api(originalRequest));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { getDeviceId } = await import('@/utils/device-id');
        await api.post('/auth/refresh-token', {
          deviceId: getDeviceId(),
        });

        processQueueSuccess();
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError);

        if (typeof window !== 'undefined') {
          // Eliminar el estado persistido de Redux para que redux-persist
          // no rehidrate con datos obsoletos (isAuthenticated: true, user stale).
          // Si no se limpia, al recargar la app puede quedar en un estado
          // inconsistente que produce pantalla blanca.
          localStorage.removeItem('persist:auth');

          window.location.href = '/login';
        }

        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

export { api };
