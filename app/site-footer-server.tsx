import { unstable_noStore as noStore } from 'next/cache';
import { getSystemSettings } from '@/lib/system-settings';
import SiteFooter from './site-footer';
import { getSiteAsset } from '@/lib/site-assets';

export default async function SiteFooterServer() {
  noStore();
  const [settings, footerLogoUrl, bctBadgeUrl] = await Promise.all([
    getSystemSettings(),
    getSiteAsset('LOGO_FOOTER', ''),
    getSiteAsset('BADGE_BCT', ''),
  ]);

  return <SiteFooter settings={settings} footerLogoUrl={footerLogoUrl} bctBadgeUrl={bctBadgeUrl} />;
}