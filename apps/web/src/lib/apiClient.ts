import axios, { AxiosError, type AxiosRequestConfig } from 'axios';
import { tokenStore } from './tokenStore';

export interface ApiErrorBody {
  error?: { code?: string; message?: string; details?: unknown };
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string,
    public readonly details?: unknown,
  ) {
    super(message);
  }
}

export const api = axios.create({ baseURL: '/api', withCredentials: true, timeout: 20_000 });

api.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let onSessionLost: () => void = () => {};

export function setSessionLostHandler(handler: () => void) {
  onSessionLost = handler;
}

let refreshInFlight: Promise<{ accessToken: string; user: unknown } | null> | null = null;

/**
 * Renueva la sesión con la cookie httpOnly. Es "single-flight": si varias
 * partes de la app lo piden a la vez, comparten la misma petición (el
 * refresh token rota y no puede usarse dos veces).
 */
export function refreshSession(): Promise<{ accessToken: string; user: unknown } | null> {
  refreshInFlight ??= axios
    .post('/api/auth/refresh', null, { withCredentials: true })
    .then(({ data }) => {
      tokenStore.set(data.accessToken);
      return data;
    })
    .catch(() => {
      tokenStore.set(null);
      return null;
    })
    .finally(() => {
      refreshInFlight = null;
    });
  return refreshInFlight;
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiErrorBody>) => {
    const original = error.config as (AxiosRequestConfig & { _retry?: boolean }) | undefined;
    const status = error.response?.status ?? 0;
    const isAuthCall = original?.url?.startsWith('/auth/');

    if (status === 401 && original && !original._retry && !isAuthCall) {
      original._retry = true;
      const token = (await refreshSession())?.accessToken ?? null;
      if (token) return api(original);
      onSessionLost();
    }

    const body = error.response?.data;
    const message =
      body?.error?.message ??
      (status === 0 ? 'No hay conexión con el servidor' : status >= 500 ? 'El servicio tuvo un problema' : error.message);
    return Promise.reject(new ApiError(message, status, body?.error?.code ?? 'ERROR', body?.error?.details));
  },
);

export const errorMessage = (error: unknown) => (error instanceof Error ? error.message : 'Ocurrió un error');

/** Llave de idempotencia por intento: el mismo clic repetido no duplica nada. */
/**
 * UUID v4 para Idempotency-Key. `crypto.randomUUID` solo existe en contexto
 * seguro (HTTPS o localhost); desde el celular por la IP de la red local no,
 * así que se arma con `getRandomValues`, que sí está disponible.
 */
export function newIdempotencyKey(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
