import { notFound } from 'next/navigation';

import { prisma } from '@/lib/prisma';
import PrintButton from '../../print-button';

export const dynamic = 'force-dynamic';

export default async function PackingSlipPage({ params }: { params: { orderCode: string } }) {
  const order = await prisma.order.findUnique({
    where: { orderCode: params.orderCode },
    include: { items: { include: { product: { select: { slug: true } } } } },
  });
  if (!order) notFound();

  return <main className="page-shell packing-slip"><div className="page-title print-hide"><div><p className="eyebrow">Mắc Khén Farm</p><h1>Phiếu gửi hàng</h1></div><PrintButton /></div><section className="page-card"><h1>Phiếu gửi hàng · {order.orderCode}</h1><p>Ngày đặt: {order.createdAt.toLocaleString('vi-VN')}</p><p><strong>Người nhận:</strong> {order.customerName}</p><p><strong>Điện thoại:</strong> {order.phone}</p><p><strong>Địa chỉ:</strong> {order.address}</p><p><strong>Đơn vị vận chuyển:</strong> {order.carrier ?? 'Chưa phân công'} · <strong>Mã vận đơn:</strong> {order.trackingCode ?? 'Chưa có'}</p><div className="table-card"><table><thead><tr><th>SKU</th><th>Sản phẩm</th><th>Phân loại</th><th>Số lượng</th></tr></thead><tbody>{order.items.map((item) => <tr key={item.id}><td>{item.product.slug}</td><td>{item.productName}</td><td>{item.variantLabel ?? '-'}</td><td>{item.quantity}</td></tr>)}</tbody></table></div><h2>Lưu ý đóng gói</h2><ul><li>Bỏ kèm tăm tre và khăn ướt.</li><li>Cho gói khử oxy vào từng sản phẩm và kiểm tra niêm phong.</li><li>Đóng hộp carton 3 lớp, chèn màng xốp bóng khí.</li></ul><p><strong>Ghi chú khách hàng:</strong> {order.note || 'Không có'}</p></section></main>;
}