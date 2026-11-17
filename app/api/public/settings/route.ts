import { NextResponse } from 'next/server';
import { getSystemSettings } from '@/lib/system-settings';

export const dynamic = 'force-dynamic';

export async function GET() {
  const settings = await getSystemSettings();
  const {
    companyName, taxCode, representativeName, address, hotline, email,
    b2bItemsPerCarton, b2bCartonWeightKg, dppSupplyGPS, dppLabResult,
    announcementBarText, announcementBarEnabled, contactHotline, contactZalo,
    businessName, businessTaxCode, bctVerifiedUrl, homePromoTitle, homePromoVoucherCode,
    heroScarcityBadge, heroScarcityPercent,
  } = settings;

  return NextResponse.json({ settings: {
    companyName, taxCode, representativeName, address, hotline, email,
    b2bItemsPerCarton, b2bCartonWeightKg, dppSupplyGPS, dppLabResult,
    announcementBarText, announcementBarEnabled, contactHotline, contactZalo,
    businessName, businessTaxCode, bctVerifiedUrl, homePromoTitle, homePromoVoucherCode,
    heroScarcityBadge, heroScarcityPercent,
  } }, {
    headers: { 'Cache-Control': 'no-store, max-age=0' },
  });
}