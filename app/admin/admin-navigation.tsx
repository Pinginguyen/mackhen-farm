'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, ClipboardList, LayoutDashboard, Package, RotateCcw, Settings, Tag, Users, Wallet } from 'lucide-react';

const groups = [
  { label: 'KINH DOANH', items: [
    { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admin/orders', label: 'Đơn hàng', icon: ClipboardList },
    { href: '/admin/returns', label: 'Đổi trả', icon: RotateCcw },
    { href: '/admin/reconciliation', label: 'Đối soát', icon: Wallet },
  ] },
  { label: 'CỬA HÀNG', items: [
    { href: '/admin/products', label: 'Sản phẩm & kho', icon: Package },
    { href: '/admin/customers', label: 'Khách hàng', icon: Users },
    { href: '/admin/vouchers', label: 'Voucher & Khuyến mãi', icon: Tag },
  ] },
  { label: 'HỆ THỐNG', items: [
    { href: '/admin/reports', label: 'Báo cáo doanh thu', icon: BarChart3 },
    { href: '/admin/settings', label: 'Cài đặt', icon: Settings },
  ] },
];

export default function AdminNavigation() {
  const pathname = usePathname();

  return (
    <nav className="admin-navigation" aria-label="Điều hướng quản trị">
      {groups.map((group) => <section className="admin-navigation-group" key={group.label} aria-label={group.label}>
        <p>{group.label}</p>
        {group.items.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href === '/admin/dashboard' && pathname === '/admin') || (href !== '/admin/dashboard' && pathname.startsWith(`${href}/`));
          return <Link className={active ? 'is-active' : ''} href={href} key={href} aria-current={active ? 'page' : undefined}>
            <Icon size={18} aria-hidden="true" />
            <span>{label}</span>
          </Link>;
        })}
      </section>)}
    </nav>
  );
}