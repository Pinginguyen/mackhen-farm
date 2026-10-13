import { cookies, headers } from 'next/headers';

export class ApiRequestError extends Error {
  constructor(readonly status: number, path: string) {
    super(`API request failed: ${status} ${path}`);
  }
}

export async function fetchApi<T>(path: string): Promise<T> {
  const requestHeaders = headers();
  const host = requestHeaders.get('x-forwarded-host') ?? requestHeaders.get('host') ?? 'localhost:3000';
  const protocol = requestHeaders.get('x-forwarded-proto') ?? 'http';
  const baseUrl = process.env.APP_URL ?? `${protocol}://${host}`;
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
  } catch {
    return { data: fallback, unavailable: true };
  }
}