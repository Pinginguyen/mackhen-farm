import 'dotenv/config';

import { randomBytes } from 'node:crypto';
import { expect, test, type Page } from '@playwright/test';
import { createOrderChecksum } from '../../lib/crypto-order';
import { prisma } from '../../lib/prisma';

const baseURL = process.env.E2E_BASE_URL || process.env.AUDIT_BASE_URL || 'http://localhost:3000';
const base = new URL(baseURL);
const adminEmail = process.env.AUDIT_ADMIN_EMAIL || 'admin@mackhenfarm.vn';
const adminPassword = process.env.AUDIT_ADMIN_PASSWORD || '';
const databaseIsLocal = (() => {
  try { return ['localhost', '127.0.0.1', '::1'].includes(new URL(process.env.DATABASE_URL || '').hostname); }
  catch { return false; }
})();
const mutationsAllowed = ['localhost', '127.0.0.1', '::1'].includes(base.hostname)
  && process.env.GOD_MODE_ALLOW_MUTATIONS === '1'
  && databaseIsLocal;

test.use({ baseURL });
test.setTimeout(45_000);

type FixtureOrder = { id: string; orderCode: string; numericCode: number };

function uniqueToken(): string {
  return randomBytes(6).toString('hex').toUpperCase();
}

async function loginAdmin(page: Page): Promise<void> {
  expect(adminPassword, 'Set AUDIT_ADMIN_PASSWORD to run authenticated admin checks.').not.toBe('');
  const response = await page.request.post(new URL('/api/auth/login', baseURL).toString(), {
    data: { email: adminEmail, password: adminPassword },
  });
  expect(response.ok(), `Admin login failed with HTTP ${response.status()}`).toBeTruthy();
}

async function createOrderFixture(overrides: { paymentMethod?: 'COD' | 'VIETQR'; orderStatus?: 'PENDING' | 'DELIVERED'; totalAmount?: number } = {}): Promise<FixtureOrder> {
  const token = uniqueToken();
  const product = await prisma.product.findFirst({ where: { active: true }, select: { id: true, name: true, price: true } });
  expect(product, 'A seeded active product is required for order fixtures.').toBeTruthy();
  const order = await prisma.order.create({
    data: {
      orderCode: `MKF-${String(Math.floor(100000 + Math.random() * 900000))}`,
      customerName: `Playwright ${token}`,
      phone: '0762793244',
      address: 'Local Playwright fixture',
      orderStatus: overrides.orderStatus ?? 'PENDING',
      paymentMethod: overrides.paymentMethod ?? 'COD',
      paymentStatus: overrides.orderStatus === 'DELIVERED' ? 'PAID' : 'PENDING',
      subtotal: overrides.totalAmount ?? product!.price,
      shippingFee: 0,
      totalAmount: overrides.totalAmount ?? product!.price,
      items: { create: [{ productId: product!.id, productName: product!.name, titleSnapshot: product!.name, variantNameSnapshot: '', skuSnapshot: product!.id, quantity: 1, unitPrice: product!.price, discountAllocated: 0, finalPrice: product!.price, lineTotal: product!.price }] },
    },
    select: { id: true, orderCode: true, numericCode: true },
  });
  return order;
}

async function removeOrderFixture(order: FixtureOrder | undefined): Promise<void> {
  if (order) await prisma.order.deleteMany({ where: { id: order.id } });
}

test('01 Login Admin & Session Guard redirects unauthenticated users', async ({ page }) => {
  await page.goto('/admin/dashboard', { waitUntil: 'domcontentloaded' });
  await expect.poll(() => new URL(page.url()).pathname).toMatch(/dang-nhap|login/);
  await loginAdmin(page);
  const response = await page.goto('/admin/dashboard', { waitUntil: 'domcontentloaded' });
  expect(response?.status()).toBeLessThan(400);
  await expect(page.getByRole('heading', { name: /hoạt động cửa hàng/i })).toBeVisible();
});

test('02 Dashboard APM and Neon PostgreSQL connection health are exposed', async ({ page }) => {
  await loginAdmin(page);
  const response = await page.request.get(new URL('/api/admin/monitoring', baseURL).toString());
  expect(response.status()).toBe(200);
  const payload = await response.json() as { database: string; databaseLatencyMs: number | null; connectionPooler: string };
  expect(payload.database).toBe('healthy');
  expect(payload.databaseLatencyMs).toBeGreaterThanOrEqual(0);
  expect(['pooler-configured', 'pooler-not-detected']).toContain(payload.connectionPooler);
  await page.goto('/admin/settings?tab=monitoring', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('main')).toContainText(/Neon|PostgreSQL|connection pool|kết nối/i);
});

test('03 ATP inventory returns Physical, Reserved, and Available as a consistent equation', async ({ page }) => {
  await loginAdmin(page);
  const response = await page.request.get(new URL('/api/admin/inventory', baseURL).toString());
  expect(response.status()).toBe(200);
  const payload = await response.json() as { items: Array<{ stock: number; committed: number; available: number }> };
  expect(payload.items.length).toBeGreaterThan(0);
  for (const item of payload.items) {
    expect(Number.isSafeInteger(item.stock)).toBe(true);
    expect(Number.isSafeInteger(item.committed)).toBe(true);
    expect(Number.isSafeInteger(item.available)).toBe(true);
    expect(item.available).toBe(item.stock - item.committed);
  }
  await page.goto('/admin/inventory', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('main')).toContainText(/Tồn thực tế|Đang giữ|Khả dụng|ATP/i);
});

test('04 Order list safely serializes BigInt-sized money values without a 500', async ({ page }) => {
  await loginAdmin(page);
  const response = await page.request.get(new URL('/api/admin/orders', baseURL).toString());
  expect(response.status()).toBe(200);
  const payload = await response.json() as { items: Array<{ orderCode: string; total: number }> };
  expect(Array.isArray(payload.items)).toBe(true);
  for (const order of payload.items) {
    expect(order.orderCode).toMatch(/^MKF-\d{6}$/);
    expect(Number.isSafeInteger(order.total)).toBe(true);
    expect(BigInt(order.total).toString()).toBe(String(order.total));
  }
});

test('05 FSM rejects skipped order transitions and accepts the next valid state', async ({ page }) => {
  test.skip(!mutationsAllowed, 'Requires localhost, DATABASE_URL, and GOD_MODE_ALLOW_MUTATIONS=1.');
  await loginAdmin(page);
  const order = await createOrderFixture();
  try {
    const jump = await page.request.patch(new URL('/api/admin/orders', baseURL).toString(), { data: { orderCode: order.orderCode, status: 'DELIVERED' } });
    expect(jump.status()).toBe(409);
    const next = await page.request.patch(new URL('/api/admin/orders', baseURL).toString(), { data: { orderCode: order.orderCode, status: 'CONFIRMED' } });
    expect(next.status()).toBe(200);
    const persisted = await prisma.order.findUniqueOrThrow({ where: { id: order.id }, select: { orderStatus: true } });
    expect(persisted.orderStatus).toBe('CONFIRMED');
  } finally {
    await removeOrderFixture(order);
  }
});

test('06 Invoice print renders a barcode and SHA-256 checksum', async ({ page }) => {
  test.skip(!mutationsAllowed, 'Requires a disposable local database fixture.');
  await loginAdmin(page);
  const order = await createOrderFixture();
  try {
    const response = await page.goto(`/admin/orders/print/${order.orderCode}`, { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBe(200);
    await expect(page.getByRole('img', { name: new RegExp(`Barcode Code128.*${order.orderCode}`) })).toBeVisible();
    await expect(page.getByText(/SHA-256 Digital Checksum/i)).toBeVisible();
    const printedChecksum = await page.locator('.packing-integrity code').innerText();
    const persistedOrder = await prisma.order.findUniqueOrThrow({ where: { id: order.id }, select: { orderCode: true, totalAmount: true, createdAt: true } });
    expect(printedChecksum).toBe(createOrderChecksum(persistedOrder));
  } finally {
    await removeOrderFixture(order);
  }
});

test('07 Voucher lifecycle creates, verifies, disables, and removes its fixture', async ({ page }) => {
  test.skip(!mutationsAllowed, 'Requires localhost and GOD_MODE_ALLOW_MUTATIONS=1.');
  await loginAdmin(page);
  const code = `PW-${uniqueToken()}`;
  let voucherId = '';
  let cartItemId = '';
  try {
    const created = await page.request.post(new URL('/api/admin/vouchers', baseURL).toString(), {
      data: { code, name: 'Playwright lifecycle', discountType: 'FIXED', value: 10000, minSpend: 0, usageLimit: 1, expiresAt: new Date(Date.now() + 86_400_000).toISOString(), isActive: true, freeShipping: false, firstOrderOnly: false, showOnPromoPage: false },
    });
    expect(created.status()).toBe(201);
    voucherId = (await created.json() as { item: { id: string } }).item.id;
    const listing = await page.request.get(new URL('/api/admin/vouchers', baseURL).toString());
    expect(listing.status()).toBe(200);
    const items = (await listing.json() as { items: Array<{ id: string; code: string; isActive: boolean }> }).items;
    expect(items.find((item) => item.id === voucherId)?.code).toBe(code);
    const product = await prisma.product.findFirst({ where: { active: true, stock: { gt: 0 }, variants: { none: {} } }, select: { id: true } });
    expect(product).toBeTruthy();
    const added = await page.request.post(new URL('/api/cart/items', baseURL).toString(), { data: { productId: product!.id, quantity: 1 } });
    expect(added.status()).toBe(200);
    cartItemId = (await added.json() as { item: { id: string } }).item.id;
    const applied = await page.request.post(new URL('/api/checkout/voucher', baseURL).toString(), { data: { voucherCode: code, phone: '0762793244' } });
    expect(applied.status()).toBe(200);
    const appliedBody = await applied.json() as { code: string; discount: number };
    expect(appliedBody.code).toBe(code);
    expect(appliedBody.discount).toBe(10000);
    const disabled = await page.request.patch(new URL('/api/admin/vouchers', baseURL).toString(), {
      data: { id: voucherId, code, name: 'Playwright lifecycle', discountType: 'FIXED', value: 10000, minSpend: 0, usageLimit: 1, expiresAt: new Date(Date.now() + 86_400_000).toISOString(), isActive: false, freeShipping: false, firstOrderOnly: false, showOnPromoPage: false },
    });
    expect(disabled.status()).toBe(200);
    expect((await disabled.json() as { item: { isActive: boolean } }).item.isActive).toBe(false);
  } finally {
    if (cartItemId) await page.request.delete(new URL('/api/cart/items', baseURL).toString(), { data: { itemId: cartItemId } }).catch(() => undefined);
    if (voucherId) {
      await page.request.delete(new URL(`/api/admin/vouchers?id=${encodeURIComponent(voucherId)}`, baseURL).toString());
    }
  }
});

test('08 Affiliate commission rate and BigInt percentage arithmetic stay exact', async ({ page }) => {
  await loginAdmin(page);
  const response = await page.request.get(new URL('/api/admin/affiliates', baseURL).toString());
  expect(response.status()).toBe(200);
  const affiliates = (await response.json() as any).items || [];
// Nếu DB chưa có KOC nào, kiểm tra API trả 200 hợp lệ
if (affiliates.length === 0) {
  expect(response.status()).toBe(200);
} else {
  for (const affiliate of affiliates) {
    expect(affiliate.commissionRate).toBeGreaterThanOrEqual(10);
    expect(affiliate.commissionRate).toBeLessThanOrEqual(15);
  }
}
  for (const affiliate of affiliates) {
    expect(affiliate.commissionRate).toBeGreaterThanOrEqual(10);
    expect(affiliate.commissionRate).toBeLessThanOrEqual(15);
    expect(Number.isSafeInteger(affiliate.commission)).toBe(true);
    expect(Number.isSafeInteger(affiliate.commissionDue)).toBe(true);
    const paidOrders = await prisma.order.findMany({
      where: { affiliateCode: affiliate.affiliateCode, paymentStatus: 'PAID', orderStatus: { not: 'CANCELLED' } },
      select: { totalAmount: true, affiliateCommissionRate: true, affiliateCommissionPaidAt: true },
    });
    const commission = paidOrders.reduce((sum, order) => sum + (BigInt(order.totalAmount) * BigInt(order.affiliateCommissionRate ?? affiliate.commissionRate)) / 100n, 0n);
    const due = paidOrders.filter((order) => !order.affiliateCommissionPaidAt)
      .reduce((sum, order) => sum + (BigInt(order.totalAmount) * BigInt(order.affiliateCommissionRate ?? affiliate.commissionRate)) / 100n, 0n);
    expect(BigInt(affiliate.commission)).toBe(commission);
    expect(BigInt(affiliate.commissionDue)).toBe(due);
  }
});

test('09 Returns regression requires a healthy API response and no hidden load error', async ({ page }) => {
  test.skip(!mutationsAllowed, 'Requires localhost and a disposable database fixture.');
  await loginAdmin(page);
  const order = await createOrderFixture();
  const returnRequest = await prisma.returnRequest.create({
    data: { orderId: order.id, customerPhone: '0762793244', issueType: 'Khác', description: 'Playwright returns API regression fixture.' },
    select: { id: true },
  });
  try {
    const api = await page.request.get(new URL('/api/returns', baseURL).toString());
    expect(api.status()).toBe(200);
    const payload = await api.json() as { items?: Array<{ order: { orderCode: string } }> };
    expect(Array.isArray(payload.items)).toBe(true);
    expect(payload.items?.some((item) => item.order.orderCode === order.orderCode)).toBe(true);
    await page.goto('/admin/returns', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.admin-return-table')).toBeVisible();
    await expect(page.locator('.admin-return-table')).toContainText(order.orderCode);
    await expect(page.getByRole('alert')).toHaveCount(0);
  } finally {
    await prisma.returnRequest.deleteMany({ where: { id: returnRequest.id } });
    await removeOrderFixture(order);
  }
});

test('10 Admin APIs reject requests without a valid session cookie', async ({ request }) => {
  for (const path of ['/api/admin/orders', '/api/admin/inventory', '/api/returns', '/api/admin/vouchers']) {
    const response = await request.get(new URL(path, baseURL).toString());
    expect([401, 403]).toContain(response.status());
  }
});

test.afterAll(async () => {
  await prisma.$disconnect();
});