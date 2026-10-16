import { beforeEach, describe, expect, it, vi } from 'vitest';

const { voucherUpsert } = vi.hoisted(() => ({ voucherUpsert: vi.fn() }));

vi.mock('@/lib/prisma', () => ({ prisma: { voucher: { upsert: voucherUpsert } } }));

import { ensureCoreVouchers } from './ensure-core-vouchers';

describe('ensureCoreVouchers', () => {
  beforeEach(() => voucherUpsert.mockReset().mockResolvedValue({}));

  it('creates both public default vouchers without overwriting existing admin edits', async () => {
    await ensureCoreVouchers();

    expect(voucherUpsert).toHaveBeenCalledTimes(2);
    expect(voucherUpsert).toHaveBeenCalledWith({
      where: { code: 'FREESHIP' },
      create: expect.objectContaining({
        name: 'Miễn phí vận chuyển toàn quốc',
        discountType: 'FIXED',
        value: 35000,
        minSpend: 250000,
        freeShipping: true,
        isActive: true,
        showOnPromoPage: true,
      }),
      update: {},
    });
    expect(voucherUpsert).toHaveBeenCalledWith({
      where: { code: 'GIAM10' },
      create: expect.objectContaining({
        name: 'Ưu đãi thành viên mới - Đơn đầu tiên',
        discountType: 'PERCENTAGE',
        value: 10,
        maxDiscount: 30000,
        minSpend: 150000,
        firstOrderOnly: true,
        isActive: true,
        showOnPromoPage: true,
      }),
      update: {},
    });
  });
});