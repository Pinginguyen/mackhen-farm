import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { SESSION_COOKIE, verifySessionToken } from '@/lib/auth';
import HeaderContent from './HeaderContent';
import { getSiteAsset } from '@/lib/site-assets';
import { getCoreContentSettings } from '@/lib/system-settings';

export default async function Header() {
  const [logoUrl, contentSettings] = await Promise.all([
    getSiteAsset('LOGO_HEADER', ''),
    getCoreContentSettings(),
  ]);
  const showAnnouncement = contentSettings.announcementBarEnabled && Boolean(contentSettings.announcementBarText.trim());
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
  return <div className="sticky top-0 z-50 flex flex-col gap-0">
    {showAnnouncement && (
      <div className="flex h-8 shrink-0 items-center justify-center overflow-hidden bg-[#1B4332] px-4 text-center text-xs font-medium text-[#FAF7F2]">
        <span className="truncate">{contentSettings.announcementBarText}</span>
      </div>
    )}
    <HeaderContent user={user} logoUrl={logoUrl} />
  </div>;
}