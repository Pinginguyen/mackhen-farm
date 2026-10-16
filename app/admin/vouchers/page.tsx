import { prisma } from '@/lib/prisma';
import VoucherManager from './voucher-manager';

export const dynamic = 'force-dynamic';

export default async function AdminVouchersPage() {
  let vouchers: Awaited<ReturnType<typeof prisma.voucher.findMany>> = [];
  try {
    vouchers = await prisma.voucher.findMany({ orderBy: [{ isActive: 'desc' }, { code: 'asc' }] });
  } catch (error) {
    console.error('Unable to load admin vouchers:', error instanceof Error ? error.name : 'UnknownError');
  }

  return (
    <main className="page-shell admin-vouchers-page">
      <div className="page-title">
        <div><p className="eyebrow">Quản trị</p><h1>Voucher &amp; Khuyến mãi</h1></div>
      </div>
      <VoucherManager initialVouchers={vouchers.map((voucher) => ({ ...voucher, expiresAt: voucher.expiresAt?.toISOString() ?? null }))} />
    </main>
  );
}