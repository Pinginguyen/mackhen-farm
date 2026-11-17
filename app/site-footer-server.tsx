'use client';

import { useEffect, useState } from 'react';
import SiteFooter from './site-footer';
import type { PublicSystemSettings } from '@/lib/system-settings';

export default function SiteFooterServer() {
  const [settings, setSettings] = useState<Partial<PublicSystemSettings>>({});
  const [footerLogoUrl, setFooterLogoUrl] = useState('');
  const [bctBadgeUrl, setBctBadgeUrl] = useState('');

  useEffect(() => {
    let active = true;
    void Promise.all([
      fetch('/api/public/settings', { cache: 'no-store' }).then((response) => response.ok ? response.json() as Promise<{ settings?: Partial<PublicSystemSettings> }> : null),
      fetch('/api/public/site-assets?key=LOGO_FOOTER', { cache: 'no-store' }).then((response) => response.ok ? response.json() as Promise<{ url?: string }> : null),
      fetch('/api/public/site-assets?key=BADGE_BCT', { cache: 'no-store' }).then((response) => response.ok ? response.json() as Promise<{ url?: string }> : null),
    ]).then(([settingsResponse, footerLogoResponse, badgeResponse]) => {
      if (!active) return;
      if (settingsResponse?.settings) setSettings(settingsResponse.settings);
      if (footerLogoResponse?.url) setFooterLogoUrl(footerLogoResponse.url);
      if (badgeResponse?.url) setBctBadgeUrl(badgeResponse.url);
    }).catch(() => undefined);
    return () => { active = false; };
  }, []);

  return <SiteFooter settings={settings} footerLogoUrl={footerLogoUrl} bctBadgeUrl={bctBadgeUrl} />;
}