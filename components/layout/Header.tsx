import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { SESSION_COOKIE, verifySessionToken } from '@/lib/auth';
import HeaderContent from './HeaderContent';

export default async function Header() {
  const session = verifySessionToken(cookies().get(SESSION_COOKIE)?.value);
  let user: { name: string; role: 'CUSTOMER' | 'ADMIN' } | null = null;
  if (session) {
    try {
      const authenticatedUser = await prisma.user.findUnique({ where: { id: session.userId }, select: { name: true, role: true } });
      if (authenticatedUser && (authenticatedUser.role === 'CUSTOMER' || authenticatedUser.role === 'ADMIN')) {
        user = { name: authenticatedUser.name, role: authenticatedUser.role };
      }
    } catch {
      user = null;
    }
  }
  return <>
    <HeaderContent user={user} />
    <div className="h-20 w-full" aria-hidden="true" />
  </>;
}