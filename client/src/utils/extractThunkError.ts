import { AxiosError } from 'axios';
import type { ApiErrorResponse } from '@/types/auth.types';

/**
 * Extrae un mensaje de error de un error de Axios para uso en thunks de Redux.
 */
export function extractThunkError(err: unknown, fallback: string): string {
  if (err instanceof AxiosError) {
    const data = err.response?.data as ApiErrorResponse | undefined;
    const message = data?.message;
    const text = Array.isArray(message) ? message[0] : message;
    return text ?? fallback;
  }

  if (err instanceof Error) {
    return err.message;
  }

  return fallback;
}
