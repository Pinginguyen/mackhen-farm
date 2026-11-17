import { NextResponse } from 'next/server';

import { getRequestSession, type SessionPayload } from '@/lib/auth';
import { getClientIpHash } from '@/lib/affiliate-fraud';
import { prisma } from '@/lib/prisma';

type AffiliateAccount = {
  id: string;
  userId: string;
  affiliateCode: string;
  commissionRate: number;
  active: boolean;
  user: { name: string; email: string; role: 'CUSTOMER' | 'ADMIN' | 'AFFILIATE'; phone: string | null; signupIpHash: string | null };
};

type AffiliateAccess = { affiliate: AffiliateAccount; session: SessionPayload; denied?: never } | { denied: NextResponse; affiliate?: never; session?: never };

export async function requireAffiliate(request: Request): Promise<AffiliateAccess> {
  const session = getRequestSession(request);
  if (!session || session.role !== 'AFFILIATE') {
    return { denied: NextResponse.json({ error: 'Vui lòng đăng nhập bằng tài khoản KOC.' }, { status: 401 }) };
  }

  try {
    const affiliate = await prisma.affiliate.findUnique({
      where: { userId: session.userId },
      select: { id: true, userId: true, affiliateCode: true, commissionRate: true, active: true, user: { select: { name: true, email: true, role: true, phone: true, signupIpHash: true } } },
    });
    if (!affiliate?.active || affiliate.user.role !== 'AFFILIATE') return { denied: NextResponse.json({ error: 'Tài khoản đối tác chưa được kích hoạt hoặc đã tạm khóa.' }, { status: 403 }) };
    if (!affiliate.user.signupIpHash) {
      const signupIpHash = getClientIpHash(request);
      if (signupIpHash) {
        try {
          const captured = await prisma.user.updateMany({ where: { id: affiliate.userId, signupIpHash: null }, data: { signupIpHash } });
          if (captured.count) affiliate.user.signupIpHash = signupIpHash;
        } catch {
          // Affiliate access must not depend on optional fraud telemetry.
        }
      }
    }
    return { affiliate, session };
  } catch {
    return { denied: NextResponse.json({ error: 'Không thể xác minh tài khoản đối tác.' }, { status: 503 }) };
  }
}