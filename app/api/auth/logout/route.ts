import { NextResponse } from 'next/server';

import { SESSION_COOKIE } from '@/lib/auth';

function clearSessionCookie(response: NextResponse): NextResponse {
  response.cookies.set(SESSION_COOKIE, '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 0 });
  return response;
}

export async function POST() {
  try {
    return clearSessionCookie(NextResponse.json({ loggedOut: true }));
  } catch {
    return NextResponse.json({ error: 'Không thể đăng xuất lúc này.' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const suspended = new URL(request.url).searchParams.get('reason') === 'account_suspended';
  const destination = new URL(suspended ? '/dang-nhap?error=account_suspended' : '/dang-nhap', request.url);
  return clearSessionCookie(NextResponse.redirect(destination));
}