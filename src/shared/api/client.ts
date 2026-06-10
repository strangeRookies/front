import { authStore } from './authStore';

const API_BASE_URL = (import.meta.env.VITE_BACKEND_BASE_URL || 'http://localhost:8080').replace(/\/$/, '');

export interface ApiSuccessResponse<T> {
  success?: boolean;
  status?: string;
  message?: string;
  data: T;
}

export interface ApiErrorResponse {
  success?: boolean;
  status?: string;
  error?: {
    code: string;
    message: string;
    fieldErrors: unknown;
  };
  message?: string;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly fieldErrors?: unknown;

  constructor(message: string, status: number, code?: string, fieldErrors?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}

interface ApiRequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  accessToken?: string;
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { body, accessToken, headers, ...init } = options;
  const token = accessToken || authStore.getAccessToken();
  
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json')
    ? ((await response.json()) as ApiResponse<T>)
    : null;

  const isSuccess = !!payload && ((payload as ApiSuccessResponse<T>).success === true || (payload as any).status === 'SUCCESS');
  const isError = !!payload && ((payload as ApiErrorResponse).success === false || (payload as any).status === 'ERROR' || (payload as any).status === 'FAIL');

  if (!response.ok || isError) {
    const error = payload && 'error' in payload ? payload.error : undefined;
    const errorMessage = error?.message || (payload as any)?.message || `요청 처리에 실패했습니다. (${response.status})`;
    const fieldErrorMessage = formatFieldErrors(error?.fieldErrors);
    
    throw new ApiError(
      [errorMessage, fieldErrorMessage].filter(Boolean).join('\n'),
      response.status,
      error?.code || (payload as any)?.status,
      error?.fieldErrors,
    );
  }

  if (isSuccess && payload && 'data' in payload) {
    return payload.data;
  }

  // Fallback for raw data if no success/status envelope is found but response is ok
  if (response.ok && payload && !('success' in payload) && !('status' in payload)) {
    return payload as T;
  }

  return undefined as T;
}

function formatFieldErrors(fieldErrors: unknown): string {
  if (!fieldErrors) {
    return '';
  }

  if (Array.isArray(fieldErrors)) {
    return fieldErrors
      .map((item) => {
        if (typeof item === 'string') {
          return item;
        }
        if (item && typeof item === 'object') {
          const record = item as Record<string, unknown>;
          const field = record.field || record.name || record.path;
          const message = record.message || record.defaultMessage || record.reason;
          return [field, message].filter(Boolean).join(': ');
        }
        return '';
      })
      .filter(Boolean)
      .join('\n');
  }

  if (typeof fieldErrors === 'object') {
    return Object.entries(fieldErrors as Record<string, unknown>)
      .map(([field, message]) => `${field}: ${String(message)}`)
      .join('\n');
  }

  return String(fieldErrors);
}
