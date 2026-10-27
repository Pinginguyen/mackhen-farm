import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { SESSION_COOKIE, verifySessionToken } from '@/lib/auth';
import HeaderContent from './HeaderContent';

export default async function Header() {
  const session = verifySessionToken(cookies().get(SESSION_COOKIE)?.value);
  let user: { name: string; role: 'CUSTOMER' | 'ADMIN' } | null = null;
  if (session) {
    try {
      user = await prisma.user.findUnique({ where: { id: session.userId }, select: { name: true, role: true } });
    } catch {
      user = null;
    }
  }
  return <>
    <HeaderContent user={user} />
    <div className="h-20 w-full" aria-hidden="true" />
  </>;
}