import { NextResponse } from 'next/server';

import { withDatabase } from '@/lib/api-database';
import { normalizeAffiliateCode } from '@/lib/affiliate-attribution';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ accepted: false }, { status: 400 });
  }
  const affiliateCode = typeof payload === 'object' && payload !== null && 'affiliateCode' in payload
    ? normalizeAffiliateCode(payload.affiliateCode)
    : null;
  if (!affiliateCode) return NextResponse.json({ accepted: false }, { status: 400 });

  return withDatabase(async () => {
    const affiliate = await prisma.affiliate.findUnique({ where: { affiliateCode }, select: { id: true, active: true } });
    if (!affiliate?.active) return NextResponse.json({ accepted: false }, { status: 404 });
    await prisma.affiliateClick.create({ data: { affiliateId: affiliate.id } });
    return NextResponse.json({ accepted: true }, { status: 202 });
  });
}