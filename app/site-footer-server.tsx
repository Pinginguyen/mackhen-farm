import { prisma } from '@/lib/prisma';
import { unstable_noStore as noStore } from 'next/cache';
import { DEFAULT_SYSTEM_SETTINGS, type PublicSystemSettings } from '@/lib/system-settings';
import SiteFooter from './site-footer';

export default async function SiteFooterServer() {
  noStore();
  let settings: PublicSystemSettings = DEFAULT_SYSTEM_SETTINGS;

  try {
    const storedSettings = await prisma.systemSetting.findUnique({ where: { id: 'default' } });
    if (storedSettings) settings = { ...settings, ...storedSettings };
  } catch {
    settings = DEFAULT_SYSTEM_SETTINGS;
  }

  return <SiteFooter settings={settings} />;
}