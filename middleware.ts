import { NextRequest, NextResponse } from 'next/server';

function decodeBase64Url(value: string): ArrayBuffer {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4);
  return Uint8Array.from(atob(base64), (character) => character.charCodeAt(0)).buffer as ArrayBuffer;
}

type MiddlewareSession = { userId?: string; role?: string; expiresAt?: number };

async function readSession(token: string | undefined, secret: string | undefined): Promise<MiddlewareSession | null> {
  if (!token || !secret || secret.length < 32) return null;
  const [encoded, signature, extra] = token.split('.');
  if (!encoded || !signature || extra) return null;

  try {
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
    const valid = await crypto.subtle.verify('HMAC', key, decodeBase64Url(signature), new TextEncoder().encode(encoded));
    if (!valid) return null;
    const session = JSON.parse(new TextDecoder().decode(decodeBase64Url(encoded))) as MiddlewareSession;
    if (!session.userId || !['CUSTOMER', 'ADMIN'].includes(session.role ?? '') || typeof session.expiresAt !== 'number' || session.expiresAt <= Math.floor(Date.now() / 1000)) return null;
    return session;
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isAdminApi = pathname === '/api/admin' || pathname.startsWith('/api/admin/');
  const isAdminPage = pathname === '/admin' || pathname.startsWith('/admin/');
  const isAccountPage = pathname === '/tai-khoan' || pathname.startsWith('/tai-khoan/');
  const token = request.cookies.get('mkf_session')?.value;
  const sessionSecret = [process.env.AUTH_SECRET, process.env.NEXTAUTH_SECRET]
    .find((secret) => Boolean(secret && secret.length >= 32));
  const session = await readSession(token, sessionSecret);

  if (isAdminApi) {
    if (session?.role === 'ADMIN') return NextResponse.next();
    return NextResponse.json({ error: 'Truy cập bị từ chối' }, { status: 403 });
  }

  if (isAdminPage && session?.role === 'ADMIN') return NextResponse.next();
  if (isAdminPage) {
    const loginUrl = new URL('/dang-nhap', request.url);
    loginUrl.searchParams.set('callbackUrl', '/admin');
    return NextResponse.redirect(loginUrl);
  }
  if (isAccountPage && session) return NextResponse.next();
  if (!isAccountPage) return NextResponse.next();

  const loginUrl = new URL('/dang-nhap', request.url);
  loginUrl.searchParams.set('callbackUrl', isAdminPage ? '/admin' : '/tai-khoan');
  return NextResponse.redirect(loginUrl);
}

export const config = { matcher: ['/admin/:path*', '/api/admin/:path*', '/tai-khoan/:path*'] };