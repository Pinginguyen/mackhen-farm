'use client';

import { useEffect, useState } from 'react';
import SiteFooter from './site-footer';
import type { PublicSystemSettings } from '@/lib/system-settings';

export default function SiteFooterServer({ footerLogoUrl, bctBadgeUrl }: { footerLogoUrl: string; bctBadgeUrl: string }) {
  const [settings, setSettings] = useState<Partial<PublicSystemSettings>>({});

  useEffect(() => {
    let active = true;
    void fetch('/api/public/settings', { cache: 'no-store' }).then((response) => response.ok ? response.json() as Promise<{ settings?: Partial<PublicSystemSettings> }> : null).then((settingsResponse) => {
      if (!active) return;
      if (settingsResponse?.settings) setSettings(settingsResponse.settings);
    }).catch(() => undefined);
    return () => { active = false; };
  }, []);

  return <SiteFooter settings={settings} footerLogoUrl={footerLogoUrl} bctBadgeUrl={bctBadgeUrl} />;
}