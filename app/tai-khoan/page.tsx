import Link from 'next/link';
import { cookies } from 'next/headers';

import { prisma } from '@/lib/prisma';
import { SESSION_COOKIE, verifySessionToken } from '@/lib/auth';
import { formatCurrency } from '@/lib/store-data';
import LogoutButton from '../logout-button';

const statusLabels: Record<string, string> = { PENDING: 'Chờ xác nhận', CONFIRMED: 'Đã xác nhận', PROCESSING: 'Đang đóng gói', SHIPPING: 'Đang giao', DELIVERED: 'Đã giao', COMPLETED: 'Đã giao', CANCELLED: 'Đã hủy' };

export default async function CustomerAccountPage() {
  const session = verifySessionToken(cookies().get(SESSION_COOKIE)?.value);
  if (!session) return <main className="page-shell"><section className="page-card"><h1>Tài khoản của bạn</h1><p>Đăng nhập để xem thông tin cá nhân và lịch sử đơn hàng.</p><Link className="primary-action" href="/dang-nhap">Đăng nhập</Link> <Link href="/dang-ky">Tạo tài khoản</Link></section></main>;

  const [user, orders] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.userId }, select: { name: true, email: true, phone: true, address: true } }),
    prisma.order.findMany({ where: { userId: session.userId }, include: { items: true }, orderBy: { createdAt: 'desc' }, take: 50 }),
  ]);
  if (!user) return <main className="page-shell"><section className="page-card"><p role="alert">Tài khoản không còn tồn tại. Vui lòng đăng nhập lại.</p><Link href="/dang-nhap">Đăng nhập</Link></section></main>;

  return <main className="page-shell"><section className="page-card"><div className="page-title"><div><p className="eyebrow">Tài khoản</p><h1>{user.name}</h1></div><LogoutButton /></div><div className="account-grid"><section className="panel"><h2>Thông tin cá nhân</h2><p>{user.email}</p><p>{user.phone ?? 'Chưa cập nhật số điện thoại'}</p><p>{user.address ?? 'Chưa cập nhật địa chỉ'}</p></section><section className="panel"><h2>Lịch sử đơn hàng</h2>{orders.length ? <div className="table-card"><table><thead><tr><th>Mã đơn</th><th>Ngày đặt</th><th>Trạng thái</th><th>Tổng tiền</th></tr></thead><tbody>{orders.map((order) => <tr key={order.id}><td><Link href={`/tra-cuu?orderCode=${encodeURIComponent(order.orderCode)}`}>{order.orderCode}</Link></td><td>{order.createdAt.toLocaleDateString('vi-VN')}</td><td>{statusLabels[order.orderStatus] ?? order.orderStatus}</td><td>{formatCurrency(order.totalAmount)}</td></tr>)}</tbody></table></div> : <p>Chưa có đơn hàng.</p>}</section></div></section></main>;
}