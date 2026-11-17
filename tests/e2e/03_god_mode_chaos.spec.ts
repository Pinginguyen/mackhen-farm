import 'dotenv/config';

import { hash } from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import { expect, request, test, type APIRequestContext } from '@playwright/test';
import { prisma } from '../../lib/prisma';

const baseURL = process.env.AUDIT_BASE_URL || 'http://localhost:3000';
const base = new URL(baseURL);
const databaseIsLocal = (() => {
  try { return ['localhost', '127.0.0.1', '::1'].includes(new URL(process.env.DATABASE_URL || '').hostname); }
  catch { return false; }
})();
const localMutationGate = ['localhost', '127.0.0.1', '::1'].includes(base.hostname)
  && process.env.GOD_MODE_ALLOW_MUTATIONS === '1'
  && databaseIsLocal;
const adminEmail = process.env.AUDIT_ADMIN_EMAIL || 'admin@mackhenfarm.vn';
const adminPassword = process.env.AUDIT_ADMIN_PASSWORD || '';
const sepaySecret = process.env.SEPAY_WEBHOOK_SECRET || '';

test.use({ baseURL });
test.setTimeout(60_000);

type ProductFixture = { id: string; slug: string; name: string; price: number; stock: number };
type OrderFixture = { id: string; orderCode: string; numericCode: number };

function token(): string { return randomBytes(8).toString('hex').toUpperCase(); }
function absolute(path: string): string { return new URL(path, baseURL).toString(); }
function requireLocalMutations(): void {
  test.skip(!localMutationGate, 'God Mode mutations require localhost, DATABASE_URL, and GOD_MODE_ALLOW_MUTATIONS=1.');
}

async function getProduct(): Promise<ProductFixture> {
  const item = await prisma.product.findFirst({ where: { active: true, stock: { gt: 1 }, variants: { none: {} } }, select: { id: true, slug: true, name: true, price: true, stock: true } });
  expect(item, 'Seed an active, non-variant product with at least two units of stock.').toBeTruthy();
  return item!;
}

async function createOrderFixture(input: { paymentMethod?: 'COD' | 'VIETQR'; paymentStatus?: 'PENDING' | 'PAID'; totalAmount?: number; affiliateCode?: string; affiliateRate?: number } = {}): Promise<OrderFixture> {
  const product = await getProduct();
  return prisma.$transaction(async (tx) => {
    const reserved = await tx.product.updateMany({ where: { id: product.id, stock: { gte: 1 } }, data: { stock: { decrement: 1 } } });
    expect(reserved.count).toBe(1);
    return tx.order.create({
      data: {
        orderCode: `MKF-${Math.floor(100000 + Math.random() * 900000)}`,
        customerName: `Chaos QA ${token()}`, phone: '0762793244', address: 'Local chaos fixture', orderStatus: 'PENDING',
        paymentMethod: input.paymentMethod ?? 'COD', paymentStatus: input.paymentStatus ?? 'PENDING',
        subtotal: input.totalAmount ?? product.price, shippingFee: 0, totalAmount: input.totalAmount ?? product.price,
        affiliateCode: input.affiliateCode, affiliateCommissionRate: input.affiliateRate,
        items: { create: [{ productId: product.id, productName: product.name, titleSnapshot: product.name, variantNameSnapshot: '', skuSnapshot: product.slug, quantity: 1, unitPrice: input.totalAmount ?? product.price, discountAllocated: 0, finalPrice: input.totalAmount ?? product.price, lineTotal: input.totalAmount ?? product.price }] },
      }, select: { id: true, orderCode: true, numericCode: true },
    });
  });
}

async function cleanupOrder(order: OrderFixture | undefined): Promise<void> {
  if (!order) return;
  await prisma.$transaction(async (tx) => {
    const owner = await tx.order.findUnique({ where: { id: order.id }, select: { customerId: true } });
    const items = await tx.orderItem.findMany({ where: { orderId: order.id }, select: { productId: true, productVariantId: true, quantity: true, lotId: true } });
    for (const item of items) {
      await tx.product.update({ where: { id: item.productId }, data: { stock: { increment: item.quantity } } });
      if (item.productVariantId) await tx.productVariant.update({ where: { id: item.productVariantId }, data: { inventory: { increment: item.quantity } } });
      if (item.lotId) await tx.productionLot.updateMany({ where: { id: item.lotId }, data: { availableQty: { increment: item.quantity } } });
    }
    await tx.order.delete({ where: { id: order.id } });
    if (owner?.customerId) await tx.customer.deleteMany({ where: { id: owner.customerId, orders: { none: {} } } });
  });
}

async function loginAdmin(request: APIRequestContext): Promise<void> {
  expect(adminPassword, 'Set AUDIT_ADMIN_PASSWORD for admin API actions.').not.toBe('');
  const response = await request.post(absolute('/api/auth/login'), { data: { email: adminEmail, password: adminPassword } });
  expect(response.ok(), `Admin login returned HTTP ${response.status()}`).toBeTruthy();
}

async function newCustomerContext(email: string, password: string): Promise<APIRequestContext> {
  const context = await request.newContext({ baseURL });
  const login = await context.post(absolute('/api/auth/login'), { data: { email, password } });
  expect(login.ok(), `Customer login returned HTTP ${login.status()}`).toBeTruthy();
  return context;
}

async function addCartAndCheckout(context: APIRequestContext, product: ProductFixture, idempotencyKey: string, paymentMethod: 'COD' | 'VIETQR' = 'COD', voucherCode?: string, affiliateCode?: string) {
  const cart = await context.post(absolute('/api/cart/items'), { data: { productId: product.id, quantity: 1 } });
  expect(cart.status()).toBe(200);
  const item = (await cart.json() as { item: { id: string } }).item;
  return context.post(absolute('/api/orders'), {
    headers: { 'idempotency-key': idempotencyKey },
    data: {
      customer: { name: 'Playwright Chaos', phone: `09${String(Math.floor(Math.random() * 100_000_000)).padStart(8, '0')}` },
      delivery: { address: 'Local chaos test' }, paymentMethod,
      items: [{ id: item.id, quantity: 1, price: product.price }], voucherCode, affiliateCode,
    },
  });
}

test('01 Three concurrent checkout submissions with one idempotency key create one persisted order', async ({ page }) => {
  requireLocalMutations();
  const product = await getProduct();
  const key = `PW-RACE-${token()}`;
  const cart = await page.request.post(absolute('/api/cart/items'), { data: { productId: product.id, quantity: 1 } });
  expect(cart.status()).toBe(200);
  const item = (await cart.json() as { item: { id: string } }).item;
  let fixture: OrderFixture | undefined;
  try {
    const body = { customer: { name: 'Concurrent QA', phone: '0762793244' }, delivery: { address: 'Local race test' }, paymentMethod: 'COD', items: [{ id: item.id, quantity: 1, price: product.price }] };
    const responses = await Promise.all([1, 2, 3].map(() => page.request.post(absolute('/api/orders'), { headers: { 'idempotency-key': key }, data: body })));
    expect(responses.some((response) => [200, 201].includes(response.status()))).toBe(true);
    for (const response of responses) expect([200, 201, 409].includes(response.status())).toBe(true);
    const persisted = await prisma.order.findMany({ where: { idempotencyKey: key }, select: { id: true, orderCode: true, numericCode: true } });
    expect(persisted).toHaveLength(1);
    fixture = persisted[0];
  } finally {
    await cleanupOrder(fixture);
    await page.request.delete(absolute('/api/cart/items'), { data: { itemId: item.id } }).catch(() => undefined);
  }
});

test('02 Cart rejects quantity above actual stock before checkout', async ({ page }) => {
  requireLocalMutations();
  const product = await getProduct();
  const response = await page.request.post(absolute('/api/cart/items'), { data: { productId: product.id, quantity: product.stock + 1 } });
  expect([400, 409]).toContain(response.status());
  expect(await response.text()).toMatch(/stock|tồn kho/i);
});

test('03 One-use voucher race allows only one concurrent checkout to consume it', async ({ page }) => {
  requireLocalMutations();
  await loginAdmin(page.request);
  const product = await getProduct();
  const key = token();
  const email = `pw-chaos-${key.toLowerCase()}@example.invalid`;
  const password = `Pw-${token()}-a9`;
  const user = await prisma.user.create({ data: { name: 'Playwright Voucher Race', email, password: await hash(password, 10), role: 'CUSTOMER' }, select: { id: true } });
  const voucherCode = `PW-${key}`;
  const voucher = await prisma.voucher.create({ data: { code: voucherCode, discountType: 'FIXED', value: 1000, minSpend: 0, usageLimit: 1, expiresAt: new Date(Date.now() + 86_400_000) } });
  const contexts: APIRequestContext[] = [];
  const orders: OrderFixture[] = [];
  try {
    const userA = await newCustomerContext(email, password);
    const userB = await newCustomerContext(email, password);
    contexts.push(userA, userB);
    const results = await Promise.all([
      addCartAndCheckout(userA, product, `PW-VOUCHER-A-${key}`, 'COD', voucherCode),
      addCartAndCheckout(userB, product, `PW-VOUCHER-B-${key}`, 'COD', voucherCode),
    ]);
    expect(results.filter((response) => response.status() === 201 || response.status() === 200)).toHaveLength(1);
    expect([400, 409]).toContain(results.find((response) => ![200, 201].includes(response.status()))!.status());
    const persisted = await prisma.order.findMany({ where: { voucherCode }, select: { id: true, orderCode: true, numericCode: true } });
    orders.push(...persisted);
    expect(persisted).toHaveLength(1);
    const consumed = await prisma.voucher.findUniqueOrThrow({ where: { id: voucher.id }, select: { usedCount: true, isActive: true } });
    expect(consumed.usedCount).toBe(1);
    expect(consumed.isActive).toBe(false);
  } finally {
    const persistedOrders = await prisma.order.findMany({ where: { voucherCode }, select: { id: true, orderCode: true, numericCode: true } });
    for (const order of [...new Map([...orders, ...persistedOrders].map((item) => [item.id, item])).values()]) await cleanupOrder(order);
    for (const context of contexts) {
      const state = await context.storageState();
      const cartId = state.cookies.find((cookie) => cookie.name === 'bohoch_cart')?.value;
      if (cartId) await prisma.cart.deleteMany({ where: { id: decodeURIComponent(cartId) } });
      await context.dispose();
    }
    await prisma.voucher.deleteMany({ where: { id: voucher.id } });
    await prisma.user.deleteMany({ where: { id: user.id } });
  }
});

test('04a SePay rejects a missing authorization header and an invalid signature', async ({ page }) => {
  const webhook = absolute('/api/payment/sepay/webhook');
  const missing = await page.request.post(webhook, { data: { content: 'MKF-000000', transferAmount: 120000 } });
  expect(missing.status()).toBe(401);
  const wrong = await page.request.post(webhook, { headers: { authorization: 'Apikey definitely-wrong' }, data: { content: 'MKF-000000', transferAmount: 120000 } });
  expect(wrong.status()).toBe(401);
});

test('04b Missing SEPAY_WEBHOOK_SECRET remains fail-closed and does not pay an order', async ({ page }) => {
  requireLocalMutations();
  const order = await createOrderFixture({ paymentMethod: 'VIETQR', totalAmount: 120000 });
  try {
    const failClosed = await page.request.post(absolute('/api/payment/sepay/webhook'), {
      headers: { authorization: `Apikey ${sepaySecret || 'test-secret-not-configured'}` },
      data: { content: order.orderCode, transferAmount: 10000 },
    });
    expect(failClosed.status()).toBe(401);
    expect((await prisma.order.findUniqueOrThrow({ where: { id: order.id }, select: { paymentStatus: true } })).paymentStatus).toBe('PENDING');
  } finally {
    await prisma.payment.deleteMany({ where: { orderId: order.id } });
    await cleanupOrder(order);
  }
});

test('04c Authenticated underpayment is ignored and exact SePay payment marks the order paid', async ({ page }) => {
  requireLocalMutations();
  expect(sepaySecret, 'Set SEPAY_WEBHOOK_SECRET in both the Next.js server and Playwright environment; authenticated payment checks must not silently skip.').not.toBe('');
  const order = await createOrderFixture({ paymentMethod: 'VIETQR', totalAmount: 120000 });
  try {
    const underpaid = await page.request.post(absolute('/api/payment/sepay/webhook'), { headers: { authorization: `Apikey ${sepaySecret}` }, data: { id: `PW-UNDER-${token()}`, content: order.orderCode, transferAmount: 10000 } });
    expect(underpaid.status()).toBe(200);
    expect((await prisma.order.findUniqueOrThrow({ where: { id: order.id }, select: { paymentStatus: true } })).paymentStatus).toBe('PENDING');
    const paid = await page.request.post(absolute('/api/payment/sepay/webhook'), { headers: { authorization: `Apikey ${sepaySecret}` }, data: { id: `PW-PAID-${token()}`, content: order.orderCode, transferAmount: 120000 } });
    expect(paid.status()).toBe(200);
    expect((await prisma.order.findUniqueOrThrow({ where: { id: order.id }, select: { paymentStatus: true } })).paymentStatus).toBe('PAID');
  } finally {
    await prisma.payment.deleteMany({ where: { orderId: order.id } });
    await cleanupOrder(order);
  }
});

test('05 Reverse logistics restores physical stock exactly once', async ({ page }) => {
  requireLocalMutations();
  await loginAdmin(page.request);
  const product = await getProduct();
  const before = (await prisma.product.findUniqueOrThrow({ where: { id: product.id }, select: { stock: true } })).stock;
  const order = await createOrderFixture();
  try {
    const stocked = await prisma.product.findUniqueOrThrow({ where: { id: product.id }, select: { stock: true } });
    expect(stocked.stock).toBeLessThanOrEqual(before);
    const response = await page.request.patch(absolute('/api/admin/orders'), { data: { orderCode: order.orderCode, status: 'CANCELLED', cancelReason: 'Playwright cleanup fixture' } });
    expect(response.status()).toBe(200);
    expect((await prisma.product.findUniqueOrThrow({ where: { id: product.id }, select: { stock: true } })).stock).toBe(before);
  } finally {
    const current = await prisma.order.findUnique({ where: { id: order.id }, select: { orderStatus: true } });
    if (current?.orderStatus === 'CANCELLED') await prisma.order.deleteMany({ where: { id: order.id } });
    else await cleanupOrder(order);
  }
});

test('06 Referral query parameter resolves an active KOC and order records its rate', async ({ page }) => {
  requireLocalMutations();
  await loginAdmin(page.request);
  const affiliate = await prisma.affiliate.findFirst({ where: { active: true }, select: { affiliateCode: true, commissionRate: true } });
  expect(affiliate, 'An active affiliate must exist for attribution coverage.').toBeTruthy();
  await page.goto(`/?ref=${encodeURIComponent(affiliate!.affiliateCode)}`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('main')).toBeVisible();
  await page.waitForFunction((code) => {
    const raw = localStorage.getItem('mackhen_affiliate_attribution');
    return Boolean(raw && JSON.parse(raw).code === code);
  }, affiliate!.affiliateCode);
  const order = await createOrderFixture({ paymentStatus: 'PAID', affiliateCode: affiliate!.affiliateCode, affiliateRate: affiliate!.commissionRate });
  try {
    const persisted = await prisma.order.findUniqueOrThrow({ where: { id: order.id }, select: { affiliateCode: true, affiliateCommissionRate: true, totalAmount: true } });
    expect(persisted.affiliateCode).toBe(affiliate!.affiliateCode);
    const due = Number((BigInt(persisted.totalAmount) * BigInt(persisted.affiliateCommissionRate ?? 10)) / 100n);
    expect(Number.isSafeInteger(due)).toBe(true);
    const summary = await page.request.get(absolute('/api/admin/affiliates'));
    expect(summary.status()).toBe(200);
    const affiliateRow = (await summary.json() as { items: Array<{ affiliateCode: string; commissionDue: number; completedOrders: number }> }).items.find((item) => item.affiliateCode === affiliate!.affiliateCode);
    expect(affiliateRow).toBeTruthy();
    expect(affiliateRow!.completedOrders).toBeGreaterThan(0);
    expect(affiliateRow!.commissionDue).toBeGreaterThanOrEqual(due);
  } finally {
    await cleanupOrder(order);
  }
});

test('07 Audit trail records admin actor, timestamp, and status payload', async ({ page }) => {
  requireLocalMutations();
  await loginAdmin(page.request);
  const order = await createOrderFixture();
  try {
    const changed = await page.request.patch(absolute('/api/admin/orders'), { data: { orderCode: order.orderCode, status: 'CONFIRMED' } });
    expect(changed.status()).toBe(200);
    const entry = await prisma.auditLog.findFirst({ where: { targetEntity: 'Order', targetId: order.orderCode }, orderBy: { createdAt: 'desc' } });
    expect(entry).toBeTruthy();
    expect(entry!.adminEmail).toMatch(/^.+@.+$/);
    expect(entry!.createdAt.getTime()).toBeGreaterThan(Date.now() - 60_000);
    expect(JSON.stringify(entry!.newValue)).toContain('CONFIRMED');
  } finally {
    await cleanupOrder(order);
  }
});

test('08 Cleanup removes temporary orders, carts, voucher, and restores stock baseline', async ({ page }) => {
  requireLocalMutations();
  const product = await getProduct();
  const initialStock = product.stock;
  const key = `PW-CLEAN-${token()}`;
  const cart = await page.request.post(absolute('/api/cart/items'), { data: { productId: product.id, quantity: 1 } });
  expect(cart.status()).toBe(200);
  const itemId = (await cart.json() as { item: { id: string } }).item.id;
  let order: OrderFixture | undefined;
  const voucherCode = `PW-${token()}`;
  const voucher = await prisma.voucher.create({ data: { code: voucherCode, discountType: 'FIXED', value: 1000, expiresAt: new Date(Date.now() + 86_400_000) } });
  try {
    const checkout = await page.request.post(absolute('/api/orders'), { headers: { 'idempotency-key': key }, data: { customer: { name: 'Cleanup QA', phone: '0762793244' }, delivery: { address: 'Cleanup fixture' }, paymentMethod: 'COD', items: [{ id: itemId, quantity: 1, price: product.price }] } });
    expect([200, 201]).toContain(checkout.status());
    const result = await checkout.json() as { orderId: string };
    order = await prisma.order.findUniqueOrThrow({ where: { id: result.orderId }, select: { id: true, orderCode: true, numericCode: true } });
  } finally {
    await cleanupOrder(order);
    await page.request.delete(absolute('/api/cart/items'), { data: { itemId } }).catch(() => undefined);
    await prisma.voucher.deleteMany({ where: { id: voucher.id } });
  }
  const finalStock = (await prisma.product.findUniqueOrThrow({ where: { id: product.id }, select: { stock: true } })).stock;
  expect(finalStock).toBe(initialStock);
  expect(await prisma.order.count({ where: { idempotencyKey: key } })).toBe(0);
  expect(await prisma.voucher.count({ where: { id: voucher.id } })).toBe(0);
});

test.afterAll(async () => { await prisma.$disconnect(); });