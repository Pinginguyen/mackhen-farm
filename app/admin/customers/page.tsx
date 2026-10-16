import type { Prisma } from '@prisma/client';
import { Search, Users } from 'lucide-react';

import { prisma } from '@/lib/prisma';
import { formatCurrency } from '@/lib/store-data';

export const dynamic = 'force-dynamic';

type CustomerRow = { id: string; name: string; email: string; phone: string | null; createdAt: Date; _count: { orders: number } };
type CustomerSpendRow = { userId: string | null; _sum: { totalAmount: number | null } };

export default async function AdminCustomersPage({ searchParams }: { searchParams?: { q?: string } }) {
  const search = searchParams?.q?.trim() ?? '';
  const where: Prisma.UserWhereInput = {
    role: 'CUSTOMER',
    ...(search ? { OR: [
      { name: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search } },
    ] } : {}),
  };
  let customers: CustomerRow[] = [];
  let spending: CustomerSpendRow[] = [];
  let unavailable = false;
  try {
    [customers, spending] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 200,
        select: { id: true, name: true, email: true, phone: true, createdAt: true, _count: { select: { orders: true } } },
      }),
      prisma.order.groupBy({
        by: ['userId'],
        where: { userId: { not: null }, paymentStatus: 'PAID' },
        _sum: { totalAmount: true },
      }),
    ]);
  } catch (error) {
    console.error('Admin customer listing failed:', error instanceof Error ? error.name : 'UnknownError');
    unavailable = true;
  }
  const spentByUser = new Map(spending.filter((item) => item.userId).map((item) => [item.userId!, item._sum.totalAmount ?? 0]));

  return (
    <main className="page-shell admin-customers-page">
      <section className="page-card">
        <div className="page-title"><div><p className="eyebrow">Cửa hàng</p><h1>Khách hàng</h1></div><span className="admin-count-badge"><Users size={14} />{customers.length}</span></div>
        <form className="admin-customer-search" role="search">
          <Search size={17} aria-hidden="true" />
          <input type="search" name="q" defaultValue={search} placeholder="Tìm theo tên hoặc số điện thoại" aria-label="Tìm khách hàng theo tên hoặc số điện thoại" />
          <button type="submit" className="secondary-action">Tìm</button>
        </form>
        {unavailable && <p className="empty-state" role="status">Không thể tải khách hàng vì cơ sở dữ liệu hiện không khả dụng.</p>}
        <div className="table-card admin-customers-table-wrap"><table className="admin-customers-table">
          <thead><tr><th>Khách hàng</th><th>Email</th><th>Điện thoại</th><th>Đơn đã đặt</th><th>Đã chi tiêu</th><th>Ngày tham gia</th></tr></thead>
          <tbody>{customers.map((customer) => <tr key={customer.id}>
            <td><strong>{customer.name}</strong></td><td>{customer.email}</td><td>{customer.phone ?? '—'}</td><td>{customer._count.orders.toLocaleString('vi-VN')}</td><td>{formatCurrency(spentByUser.get(customer.id) ?? 0)}</td><td>{new Date(customer.createdAt).toLocaleDateString('vi-VN')}</td>
          </tr>)}
          {!customers.length && !unavailable && <tr><td colSpan={6}>Chưa có khách hàng phù hợp.</td></tr>}</tbody>
        </table></div>
        {customers.length === 200 && <p className="settings-note">Đang hiển thị tối đa 200 khách hàng mới nhất. Dùng ô tìm kiếm để thu hẹp kết quả.</p>}
      </section>
    </main>
  );
}
