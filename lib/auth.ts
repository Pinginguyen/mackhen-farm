import { createHmac, timingSafeEqual } from 'node:crypto';

export const SESSION_COOKIE = 'mkf_session';
const SESSION_SECONDS = 60 * 60 * 24 * 7;

export type SessionPayload = {
  userId: string;
  name: string;
  email: string;
  role: 'CUSTOMER' | 'ADMIN';
  expiresAt: number;
};

function authSecret(): string | null {
  return process.env.AUTH_SECRET?.length && process.env.AUTH_SECRET.length >= 32 ? process.env.AUTH_SECRET : null;
}

export function createSessionToken(user: Omit<SessionPayload, 'expiresAt'>): string | null {
  const secret = authSecret();
  if (!secret) return null;

  const payload = Buffer.from(JSON.stringify({ ...user, expiresAt: Math.floor(Date.now() / 1000) + SESSION_SECONDS })).toString('base64url');
  const signature = createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

export function verifySessionToken(token?: string): SessionPayload | null {
  const secret = authSecret();
  if (!secret || !token) return null;
  const [payload, signature, extra] = token.split('.');
  if (!payload || !signature || extra) return null;

  const expected = createHmac('sha256', secret).update(payload).digest();
  let received: Buffer;
  try {
    received = Buffer.from(signature, 'base64url');
  } catch {
    return null;
  }
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) return null;

  try {
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString()) as SessionPayload;
    if (!session.userId || !session.email || !['CUSTOMER', 'ADMIN'].includes(session.role) || session.expiresAt <= Math.floor(Date.now() / 1000)) return null;
    return session;
  } catch {
    return null;
  }
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: SESSION_SECONDS,
  };
}