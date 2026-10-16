import { prisma } from '@/lib/prisma';

const coreVouchers = [
  {
    code: 'FREESHIP',
    name: 'Miễn phí vận chuyển toàn quốc',
    discountType: 'FIXED' as const,
    value: 35000,
    maxDiscount: null,
    minSpend: 250000,
    expiresAt: null,
    isActive: true,
    usageLimit: null,
    freeShipping: true,
    firstOrderOnly: false,
    showOnPromoPage: true,
  },
  {
    code: 'GIAM10',
    name: 'Ưu đãi thành viên mới - Đơn đầu tiên',
    discountType: 'PERCENTAGE' as const,
    value: 10,
    maxDiscount: 30000,
    minSpend: 150000,
    expiresAt: null,
    isActive: true,
    usageLimit: null,
    freeShipping: false,
    firstOrderOnly: true,
    showOnPromoPage: true,
  },
];

export async function ensureCoreVouchers() {
  for (const voucher of coreVouchers) {
    await prisma.voucher.upsert({
      where: { code: voucher.code },
      create: voucher,
      update: {},
    });
  }
}