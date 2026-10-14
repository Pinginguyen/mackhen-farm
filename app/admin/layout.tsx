import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { prisma } from '@/lib/prisma';
import { SESSION_COOKIE, verifySessionToken } from '@/lib/auth';
import AdminNavigation from './admin-navigation';
import AdminHeader from './admin-header';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = verifySessionToken(cookies().get(SESSION_COOKIE)?.value);
  if (!session) redirect('/dang-nhap?callbackUrl=%2Fadmin');
  if (session.role !== 'ADMIN') redirect('/?error=forbidden');

  const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { role: true, name: true, email: true } });
  if (user?.role !== 'ADMIN') redirect('/?error=forbidden');

  return (
    <div className="admin-portal">
      <aside className="admin-sidebar">
        <Link className="admin-sidebar-brand" href="/admin/dashboard">
          <span className="brand-badge">M</span>
          <span>Mắc Khén Farm<small>ADMIN PORTAL</small></span>
        </Link>
        <AdminNavigation />
      </aside>
      <div className="admin-portal-main">
        <AdminHeader name={user.name} email={user.email} />
        {children}
      </div>
    </div>
  );
}