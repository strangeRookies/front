import { authStore } from './authStore';

const API_BASE_URL = (import.meta.env.VITE_BACKEND_BASE_URL || 'http://localhost:8080').replace(/\/$/, '');

export interface ApiSuccessResponse<T> {
  success: true;
  message: string;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    fieldErrors: unknown;
  };
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

  if (!response.ok || payload?.success === false) {
    const error = payload && payload.success === false ? payload.error : undefined;
    const fieldErrorMessage = formatFieldErrors(error?.fieldErrors);
    throw new ApiError(
      [error?.message || `요청 처리에 실패했습니다. (${response.status})`, fieldErrorMessage].filter(Boolean).join('\n'),
      response.status,
      error?.code,
      error?.fieldErrors,
    );
  }

  if (payload?.success === true) {
    return payload.data;
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
