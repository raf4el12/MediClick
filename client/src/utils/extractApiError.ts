import { AxiosError } from 'axios';

interface ApiError {
  message?: string | string[];
  statusCode?: number;
}

/**
 * Extrae un mensaje de error legible y el status code de un error de Axios.
 */
export function extractApiError(
  err: unknown,
  fallback = 'Ha ocurrido un error inesperado',
): { message: string; status: number | undefined } {
  if (err instanceof AxiosError) {
    const data = err.response?.data as ApiError | undefined;
    const msg = data?.message;
    const text = Array.isArray(msg) ? msg[0] : msg;
    return { message: text ?? fallback, status: err.response?.status };
  }

  if (err instanceof Error) {
    return { message: err.message, status: undefined };
  }

  return { message: fallback, status: undefined };
}
