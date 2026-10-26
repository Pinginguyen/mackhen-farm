import { cookies, headers } from 'next/headers';

import { resolveRequestBaseUrl } from './request-url';

export class ApiRequestError extends Error {
  constructor(readonly status: number, path: string) {
    super(`API request failed: ${status} ${path}`);
  }
}

export async function fetchApi<T>(path: string): Promise<T> {
  const requestHeaders = headers();
  const baseUrl = resolveRequestBaseUrl(requestHeaders);
  const cookieHeader = cookies().toString();
  const response = await fetch(`${baseUrl}${path}`, {
    cache: 'no-store',
    headers: cookieHeader ? { cookie: cookieHeader } : undefined,
  });

  if (!response.ok) {
    throw new ApiRequestError(response.status, path);
  }

  return response.json() as Promise<T>;
}

export async function fetchApiWithFallback<T>(path: string, fallback: T): Promise<{ data: T; unavailable: boolean }> {
  try {
    return { data: await fetchApi<T>(path), unavailable: false };
  } catch (error) {
    console.error('[CRITICAL_DB_ERROR] Chi tiết lỗi tại file này:', error instanceof Error ? error.message : error);
    return { data: fallback, unavailable: true };
  }
}