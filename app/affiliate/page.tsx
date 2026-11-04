import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import AffiliateDashboard from './affiliate-dashboard';
import { prisma } from '@/lib/prisma';
import { SESSION_COOKIE, verifySessionToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function AffiliatePortalPage() {
  const session = verifySessionToken(cookies().get(SESSION_COOKIE)?.value);
  if (!session || session.role !== 'AFFILIATE') redirect('/dang-nhap?callbackUrl=%2Faffiliate');

  const affiliate = await prisma.affiliate.findUnique({
    where: { userId: session.userId },
    select: { affiliateCode: true, commissionRate: true, active: true, user: { select: { name: true, email: true } } },
  });
  if (!affiliate) redirect('/dang-nhap?callbackUrl=%2Faffiliate');
  if (!affiliate.active) redirect('/api/auth/logout?reason=account_suspended');

  return <AffiliateDashboard initialAffiliate={{ name: affiliate.user.name, email: affiliate.user.email, affiliateCode: affiliate.affiliateCode, commissionRate: affiliate.commissionRate }} />;
}