'use client';

import Link from 'next/link';
import { Gift, UserRound } from 'lucide-react';
import { useEffect, useState } from 'react';
import LogoutButton from '@/app/logout-button';
import LiveProductSearch from './LiveProductSearch';
import CartLink from './CartLink';
import LocaleCurrencySwitcher from './LocaleCurrencySwitcher';
import SoundEffect from '@/components/common/SoundEffect';
import { useLocaleCurrency } from '@/lib/i18n-context';
import { translateContent } from '@/lib/translations';

export default function HeaderContent({ user, logoUrl }: { user: { name: string; role: 'CUSTOMER' | 'ADMIN' } | null; logoUrl: string }) {
  const [activeUser, setActiveUser] = useState(user);
  const [activeLogoUrl, setActiveLogoUrl] = useState(logoUrl);
  const [announcement, setAnnouncement] = useState<{ enabled: boolean; text: string }>({ enabled: false, text: '' });
  const { locale, t } = useLocaleCurrency();
  const initials = activeUser?.name.trim().split(/\s+/).slice(-2).map((part) => part.charAt(0)).join('').toLocaleUpperCase('vi') ?? '';
  const isAdmin = activeUser?.role === 'ADMIN';

  useEffect(() => {
    let active = true;
    async function hydrateHeader() {
      const [sessionResponse, settingsResponse, logoResponse] = await Promise.allSettled([
        fetch('/api/auth/session', { cache: 'no-store' }).then((response) => response.ok ? response.json() as Promise<{ user?: { name?: string; role?: string } | null }> : null),
        fetch('/api/public/settings', { cache: 'no-store' }).then((response) => response.ok ? response.json() as Promise<{ settings?: { announcementBarEnabled?: boolean; announcementBarText?: string } }> : null),
        fetch('/api/public/site-assets?key=LOGO_HEADER', { cache: 'no-store' }).then((response) => response.ok ? response.json() as Promise<{ url?: string }> : null),
      ]);
      if (!active) return;
      if (sessionResponse.status === 'fulfilled') {
        const account = sessionResponse.value?.user;
        setActiveUser(account && (account.role === 'CUSTOMER' || account.role === 'ADMIN') && typeof account.name === 'string'
          ? { name: account.name, role: account.role }
          : null);
      }
      if (settingsResponse.status === 'fulfilled' && settingsResponse.value?.settings) {
        const settings = settingsResponse.value.settings;
        setAnnouncement({ enabled: Boolean(settings.announcementBarEnabled), text: settings.announcementBarText ?? '' });
      }
      if (logoResponse.status === 'fulfilled' && typeof logoResponse.value?.url === 'string') setActiveLogoUrl(logoResponse.value.url);
    }
    void hydrateHeader().catch(() => undefined);
    return () => { active = false; };
  }, []);

  return (
    <div className="sticky top-0 z-50 flex flex-col gap-0">
      {announcement.enabled && announcement.text.trim() && <div className="flex h-8 shrink-0 items-center justify-center overflow-hidden bg-[#1B4332] px-4 text-center text-xs font-medium text-[#FAF7F2]"><span className="truncate">{announcement.text}</span></div>}
      <header className="topbar site-header desktop-single-row !relative left-0 right-0 w-full z-50 !bg-[#FAF7F2] !border-b !border-stone-200 shadow-sm transition-all duration-300 !p-0">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 site-header-inner">
      <Link className="brand-wrap" href="/">
        {activeLogoUrl ? <img className="brand-logo-image" src={activeLogoUrl} alt="Mắc Khén Farm" /> : <span className="brand-badge">M</span>}
        <span>
          <small className="eyebrow">{translateContent('Nông sản sấy vị Tây Bắc', locale)}</small>
          <strong className="site-brand-name">Mắc Khén Farm</strong>
        </span>
      </Link>
      <nav className="main-nav" aria-label={locale === 'en' ? 'Main menu' : 'Menu chính'}>
        <Link className="whitespace-nowrap text-sm" href="/">{t('home')}</Link>
        <Link className="whitespace-nowrap text-sm" href="/products">{t('products')}</Link>
        <Link className="header-promo-link whitespace-nowrap text-sm" href="/khuyen-mai"><Gift size={15} aria-hidden="true" /> {t('deals')} <span aria-label="Hot">Hot</span></Link>
        <Link className="whitespace-nowrap text-sm" href="/cart">{t('cart')}</Link>
        <Link className="whitespace-nowrap text-sm" href="/tra-cuu">{t('trackOrder')}</Link>
      </nav>
      <LiveProductSearch />
      <div className="site-header-actions !gap-2">
        <CartLink />
        <SoundEffect />
        <LocaleCurrencySwitcher />
        {!activeUser ? (
          <>
            <Link className="mobile-account-trigger" href="/dang-nhap" aria-label={t('login')}><UserRound size={19} /></Link>
            <div className="header-desktop-auth">
              <Link className="header-login" href="/dang-nhap">{t('login')}</Link>
              <Link className="cta-link" href="/dang-ky">{locale === 'en' ? 'Sign up' : 'Đăng ký'}</Link>
            </div>
          </>
        ) : (
          <>
            {isAdmin && <Link className="admin-header-link !h-9 !min-h-0 !px-2 !py-0 !rounded-lg !bg-[#841E1E] !text-xs !font-semibold !text-white !shadow-xs transition-all duration-300 hover:!bg-[#6F1717]" href="/admin">{locale === 'en' ? 'Admin' : 'Quản trị'}</Link>}
            <details className="account-menu">
              <summary className="!h-9 !w-9 !rounded-lg !border-stone-200/70 !bg-white" aria-label={`${locale === 'en' ? 'Account' : 'Tài khoản'} ${activeUser.name}`} title={activeUser.name}>
                <span className="account-avatar !h-9 !w-9 !rounded-lg !text-stone-700" aria-hidden="true">{initials || 'MK'}</span>
              </summary>
              <div className="account-dropdown">
                <div className="account-dropdown-heading"><span>{locale === 'en' ? 'Signed in' : 'Đang đăng nhập'}</span><strong>{activeUser.name}</strong></div>
                <span className="account-dropdown-divider" />
                <Link href="/tai-khoan">{locale === 'en' ? 'Account details' : 'Thông tin tài khoản'}</Link>
                <Link href="/tai-khoan?tab=orders">{locale === 'en' ? 'Orders' : 'Đơn mua'}</Link>
                {isAdmin && <Link href="/admin">{locale === 'en' ? 'Admin area' : 'Khu vực quản trị'}</Link>}
                <LogoutButton />
              </div>
            </details>
          </>
        )}
      </div>
        </div>
      </header>
    </div>
  );
}