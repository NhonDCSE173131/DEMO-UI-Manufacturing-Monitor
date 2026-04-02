import { appEnv } from '@/lib/config/env';
import { AppError, mapHttpStatusToCode } from '@/lib/domain/errors';
import type { ApiResponse } from '@/types/api';

interface ApiRequestInit extends RequestInit {
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 15000;

export const buildApiUrl = (path: string): string => {
  if (/^https?:\/\//.test(path)) return path;
  return `${appEnv.apiBaseUrl}${path.startsWith('/') ? path : `/${path}`}`;
};

const request = async <T>(path: string, init: ApiRequestInit = {}): Promise<T> => {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, ...restInit } = init;
  const url = buildApiUrl(path);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const response = await fetch(url, {
      cache: 'no-store',
      ...restInit,
      headers: {
        'Content-Type': 'application/json',
        ...(restInit.headers || {}),
      },
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));

    let json: ApiResponse<T> | null = null;
    try {
      json = (await response.json()) as ApiResponse<T>;
    } catch {
      if (!response.ok) {
        throw new AppError('Khong doc duoc phan hoi tu may chu', mapHttpStatusToCode(response.status), response.status);
      }
    }

    if (!response.ok) {
      throw new AppError(
        json?.message || 'Yeu cau that bai',
        mapHttpStatusToCode(response.status),
        response.status,
        json?.traceId,
      );
    }

    if (json && json.success === false) {
      throw new AppError(
        json.message || 'Nguon du lieu tra ve loi',
        'UPSTREAM_ERROR',
        response.status,
        json.traceId,
      );
    }

    return (json?.data ?? (json as unknown as T)) as T;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new AppError(`Yeu cau toi may chu bi timeout (${appEnv.apiBaseUrl})`, 'NETWORK_ERROR');
    }

    throw new AppError(`Khong ket noi duoc may chu (${appEnv.apiBaseUrl})`, 'NETWORK_ERROR');
  }
};

export const apiClient = {
  get: <T>(path: string, init?: ApiRequestInit) => request<T>(path, { method: 'GET', ...init }),
  post: <T>(path: string, body?: unknown, init?: ApiRequestInit) =>
    request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined, ...init }),
  put: <T>(path: string, body?: unknown, init?: ApiRequestInit) =>
    request<T>(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined, ...init }),
  patch: <T>(path: string, body?: unknown, init?: ApiRequestInit) =>
    request<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined, ...init }),
  delete: <T>(path: string, init?: ApiRequestInit) => request<T>(path, { method: 'DELETE', ...init }),
  getRaw: async (path: string, init: ApiRequestInit = {}) => {
    const { timeoutMs = DEFAULT_TIMEOUT_MS, ...restInit } = init;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(buildApiUrl(path), {
        cache: 'no-store',
        ...restInit,
        signal: controller.signal,
      }).finally(() => clearTimeout(timeout));

      if (!response.ok) {
        throw new AppError('Yeu cau tai tep that bai', mapHttpStatusToCode(response.status), response.status);
      }

      return response;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Khong tai duoc tep tu may chu', 'NETWORK_ERROR');
    }
  },
};

