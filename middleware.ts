import { NextRequest, NextResponse } from 'next/server';

function decodeBase64Url(value: string): ArrayBuffer {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4);
  return Uint8Array.from(atob(base64), (character) => character.charCodeAt(0)).buffer as ArrayBuffer;
}

async function isAdminSession(token: string | undefined, secret: string | undefined): Promise<boolean> {
  if (!token || !secret || secret.length < 32) return false;
  const [encoded, signature, extra] = token.split('.');
  if (!encoded || !signature || extra) return false;

  try {
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
    const valid = await crypto.subtle.verify('HMAC', key, decodeBase64Url(signature), new TextEncoder().encode(encoded));
    if (!valid) return false;
    const session = JSON.parse(new TextDecoder().decode(decodeBase64Url(encoded))) as { role?: string; expiresAt?: number };
    return session.role === 'ADMIN' && typeof session.expiresAt === 'number' && session.expiresAt > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isApi = pathname.startsWith('/api/admin/');
  const token = request.cookies.get('mkf_session')?.value;
  if (await isAdminSession(token, process.env.AUTH_SECRET)) return NextResponse.next();
  if (isApi) return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Cần quyền quản trị.' } }, { status: 403 });

  const loginUrl = new URL('/dang-nhap', request.url);
  loginUrl.searchParams.set('next', pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = { matcher: ['/admin/:path*', '/api/admin/:path*'] };