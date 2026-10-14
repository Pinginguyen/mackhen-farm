import Link from 'next/link';
import { cookies } from 'next/headers';
import { ShoppingBag } from 'lucide-react';

import { prisma } from '@/lib/prisma';
import { SESSION_COOKIE, verifySessionToken } from '@/lib/auth';
import LogoutButton from '@/app/logout-button';
import LiveProductSearch from './LiveProductSearch';

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

  return (
    <header className="topbar site-header">
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
        <Link href="/cart">Giỏ hàng</Link>
        <Link href="/tra-cuu">Tra cứu đơn</Link>
      </nav>
      <LiveProductSearch />
      <div className="site-header-actions">
        {!user ? (
          <>
            <Link className="header-login" href="/dang-nhap">Đăng nhập</Link>
            <Link className="cta-link" href="/dang-ky">Đăng ký</Link>
          </>
        ) : (
          <>
            <Link className="header-cart" href="/cart" aria-label="Giỏ hàng">
              <ShoppingBag size={19} />
            </Link>
            {user.role === 'ADMIN' && (
              <>
                <span className="admin-role-badge">Quản trị viên</span>
                <Link className="cta-link" href="/admin">Vào trang Quản trị</Link>
              </>
            )}
            <details className="account-menu">
              <summary>
                {user.name}<span aria-hidden="true">⌄</span>
              </summary>
              <div className="account-dropdown">
                <Link href="/tai-khoan">Thông tin tài khoản</Link>
                <Link href="/tai-khoan?tab=orders">Đơn mua của tôi</Link>
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