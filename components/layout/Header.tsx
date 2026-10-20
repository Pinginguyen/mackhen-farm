import Link from 'next/link';
import { cookies } from 'next/headers';
import { Gift, Search, UserRound } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { SESSION_COOKIE, verifySessionToken } from '@/lib/auth';
import LogoutButton from '@/app/logout-button';
import LiveProductSearch from './LiveProductSearch';
import CartLink from './CartLink';
import LocaleCurrencySwitcher from './LocaleCurrencySwitcher';

export default async function Header() {
  const session = verifySessionToken(cookies().get(SESSION_COOKIE)?.value);
  let user: { name: string; role: 'CUSTOMER' | 'ADMIN' } | null = null;
  if (session) {
    try {
      user = await prisma.user.findUnique({ where: { id: session.userId }, select: { name: true, role: true } });
    } catch {
      user = null;
    }
  }
  const initials = user?.name.trim().split(/\s+/).slice(-2).map((part) => part.charAt(0)).join('').toLocaleUpperCase('vi') ?? '';

  return (
    <header className="topbar site-header sticky top-0 z-50 w-full bg-[#FDFBF7]/90 backdrop-blur-md border-b border-stone-200/80 shadow-sm transition-all duration-200">
      <Link className="brand-wrap" href="/">
        <span className="brand-badge">M</span>
        <span>
          <small className="eyebrow">Nông sản sấy vị Tây Bắc</small>
          <strong className="site-brand-name">Mắc Khén Farm</strong>
        </span>
      </Link>
      <nav className="main-nav" aria-label="Menu chính">
        <Link href="/">Trang chủ</Link>
        <Link href="/products">Sản phẩm</Link>
        <Link className="header-promo-link" href="/khuyen-mai"><Gift size={15} aria-hidden="true" /> Khuyến mãi <span aria-label="Hot">Hot</span></Link>
        <Link href="/cart">Giỏ hàng</Link>
        <Link href="/tra-cuu">Tra cứu đơn</Link>
      </nav>
      <LiveProductSearch />
      <div className="site-header-actions">
        <Link className="mobile-search-trigger" href="/products" aria-label="Tìm sản phẩm"><Search size={19} /></Link>
        <CartLink />
        <LocaleCurrencySwitcher />
        {!user ? (
          <>
            <Link className="mobile-account-trigger" href="/dang-nhap" aria-label="Đăng nhập"><UserRound size={19} /></Link>
            <div className="header-desktop-auth">
              <Link className="header-login" href="/dang-nhap">Đăng nhập</Link>
              <Link className="cta-link" href="/dang-ky">Đăng ký</Link>
            </div>
          </>
        ) : (
          <>
            {user.role === 'ADMIN' && (
              <Link className="admin-header-link" href="/admin">Vào trang Quản trị</Link>
            )}
            <details className="account-menu">
              <summary aria-label={`Tài khoản ${user.name}`} title={user.name}>
                <span className="account-avatar" aria-hidden="true">{initials || 'MK'}</span>
              </summary>
              <div className="account-dropdown">
                <div className="account-dropdown-heading"><span>Đang đăng nhập</span><strong>{user.name}</strong></div>
                <span className="account-dropdown-divider" />
                <Link href="/tai-khoan">Thông tin tài khoản</Link>
                <Link href="/tai-khoan?tab=orders">Đơn mua</Link>
                {user.role === 'ADMIN' && <Link href="/admin">Khu vực quản trị</Link>}
                <LogoutButton />
              </div>
            </details>
          </>
        )}
      </div>
    </header>
  );
}