'use client';

import Link from 'next/link';
import { Gift, Search, UserRound } from 'lucide-react';
import LogoutButton from '@/app/logout-button';
import LiveProductSearch from './LiveProductSearch';
import CartLink from './CartLink';
import LocaleCurrencySwitcher from './LocaleCurrencySwitcher';
import { useLocaleCurrency } from '@/lib/i18n-context';
import { translateContent } from '@/lib/translations';

export default function HeaderContent({ user }: { user: { name: string; role: 'CUSTOMER' | 'ADMIN' } | null }) {
  const { locale, t } = useLocaleCurrency();
  const initials = user?.name.trim().split(/\s+/).slice(-2).map((part) => part.charAt(0)).join('').toLocaleUpperCase('vi') ?? '';

  return (
    <header className="topbar site-header fixed top-0 left-0 right-0 w-full z-50 bg-[#FDFBF7]/95 backdrop-blur-md border-b border-gray-200/60 shadow-sm transition-all duration-300 !py-2">
      <Link className="brand-wrap" href="/">
        <span className="brand-badge">M</span>
        <span>
          <small className="eyebrow">{translateContent('Nông sản sấy vị Tây Bắc', locale)}</small>
          <strong className="site-brand-name">Mắc Khén Farm</strong>
        </span>
      </Link>
      <nav className="main-nav" aria-label={locale === 'en' ? 'Main menu' : 'Menu chính'}>
        <Link href="/">{t('home')}</Link>
        <Link href="/products">{t('products')}</Link>
        <Link className="header-promo-link" href="/khuyen-mai"><Gift size={15} aria-hidden="true" /> {t('deals')} <span aria-label="Hot">Hot</span></Link>
        <Link href="/cart">{t('cart')}</Link>
        <Link href="/tra-cuu">{t('trackOrder')}</Link>
      </nav>
      <LiveProductSearch />
      <div className="site-header-actions !gap-2.5">
        <Link className="mobile-search-trigger" href="/products" aria-label={translateContent('Tìm sản phẩm', locale)}><Search size={19} /></Link>
        <CartLink />
        <LocaleCurrencySwitcher />
        {!user ? (
          <>
            <Link className="mobile-account-trigger" href="/dang-nhap" aria-label={t('login')}><UserRound size={19} /></Link>
            <div className="header-desktop-auth">
              <Link className="header-login" href="/dang-nhap">{t('login')}</Link>
              <Link className="cta-link" href="/dang-ky">{locale === 'en' ? 'Sign up' : 'Đăng ký'}</Link>
            </div>
          </>
        ) : (
          <>
            {user.role === 'ADMIN' && <Link className="admin-header-link !h-9 !min-h-0 !px-3 !py-0 !rounded-lg !bg-[#9B2424] !text-xs !font-semibold !text-white !shadow-xs transition-all duration-300 hover:!bg-[#831D1D]" href="/admin">{locale === 'en' ? 'Admin' : 'Vào trang Quản trị'}</Link>}
            <details className="account-menu">
              <summary className="!h-9 !w-9 !rounded-lg !border-stone-200/70 !bg-white" aria-label={`${locale === 'en' ? 'Account' : 'Tài khoản'} ${user.name}`} title={user.name}>
                <span className="account-avatar !h-9 !w-9 !rounded-lg !text-stone-700" aria-hidden="true">{initials || 'MK'}</span>
              </summary>
              <div className="account-dropdown">
                <div className="account-dropdown-heading"><span>{locale === 'en' ? 'Signed in' : 'Đang đăng nhập'}</span><strong>{user.name}</strong></div>
                <span className="account-dropdown-divider" />
                <Link href="/tai-khoan">{locale === 'en' ? 'Account details' : 'Thông tin tài khoản'}</Link>
                <Link href="/tai-khoan?tab=orders">{locale === 'en' ? 'Orders' : 'Đơn mua'}</Link>
                {user.role === 'ADMIN' && <Link href="/admin">{locale === 'en' ? 'Admin area' : 'Khu vực quản trị'}</Link>}
                <LogoutButton />
              </div>
            </details>
          </>
        )}
      </div>
    </header>
  );
}