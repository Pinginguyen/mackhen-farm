import Link from 'next/link';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function ThankYouPage({ searchParams }: { searchParams: { orderCode?: string } }) {
  if (searchParams.orderCode && /^MKF-\d{6}$/.test(searchParams.orderCode)) {
    try {
      const order = await prisma.order.findUnique({ where: { orderCode: searchParams.orderCode }, select: { paymentMethod: true, paymentStatus: true } });
      if (!order) redirect(`/tra-cuu?orderCode=${encodeURIComponent(searchParams.orderCode)}`);
      if (order.paymentMethod === 'VIETQR' && order.paymentStatus !== 'PAID') redirect(`/checkout/vietqr/${encodeURIComponent(searchParams.orderCode)}`);
    } catch (error) {
      if (error && typeof error === 'object' && 'digest' in error) throw error;
      redirect(`/tra-cuu?orderCode=${encodeURIComponent(searchParams.orderCode)}`);
    }
  }
  return <main className="page-shell auth-shell"><section className="page-card auth-card"><p className="eyebrow">Mắc Khén Farm</p><h1>Cảm ơn bạn đã đặt hàng</h1><p>{searchParams.orderCode ? `Mã đơn hàng ${searchParams.orderCode} đã được ghi nhận.` : 'Thông tin đơn hàng đã được ghi nhận.'} Bạn có thể theo dõi trạng thái vận chuyển bất cứ lúc nào.</p><div className="hero-actions"><Link className="order-success-track-button text-white font-medium text-sm px-6 py-2.5 rounded-xl bg-[#8B1E1E] hover:bg-[#721919] transition-all" href={`/tra-cuu${searchParams.orderCode ? `?orderCode=${encodeURIComponent(searchParams.orderCode)}` : ''}`}>Theo dõi đơn hàng</Link><Link className="secondary-action" href="/">Về trang chủ</Link></div></section></main>;
}