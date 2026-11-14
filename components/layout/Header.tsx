import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { SESSION_COOKIE, verifySessionToken } from '@/lib/auth';
import HeaderContent from './HeaderContent';
import { getSiteAsset } from '@/lib/site-assets';

export default async function Header() {
  const logoUrl = await getSiteAsset('LOGO_HEADER', '');
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
    <HeaderContent user={user} logoUrl={logoUrl} />
    <div className="header-spacer w-full" aria-hidden="true" />
  </>;
}