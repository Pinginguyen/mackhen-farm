export function resolveRequestBaseUrl(headersLike?: { get(name: string): string | null } | null): string {
  const forwardedHost = headersLike?.get('x-forwarded-host') ?? headersLike?.get('host') ?? '';
  const forwardedProto = headersLike?.get('x-forwarded-proto') ?? 'http';
  const host = forwardedHost.split(',')[0]?.trim();

  if (host) {
    return `${forwardedProto.split(',')[0]?.trim() || 'http'}://${host}`;
  }

  if (process.env.APP_URL) {
    return process.env.APP_URL.replace(/\/$/, '');
  }

  return 'http://localhost:3000';
}
