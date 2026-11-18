import dotenv from 'dotenv';
import { randomBytes, randomUUID } from 'node:crypto';
import { expect, test, type Page } from '@playwright/test';
import { prisma } from '../../lib/prisma';

dotenv.config({ path: '.env.local' });
dotenv.config();

const baseURL = process.env.E2E_BASE_URL || process.env.AUDIT_BASE_URL || 'http://localhost:3000';
const base = new URL(baseURL);
const adminEmail = process.env.AUDIT_ADMIN_EMAIL || 'admin@mackhenfarm.vn';
const adminPassword = process.env.AUDIT_ADMIN_PASSWORD || '';
const databaseIsLocal = (() => {
  try { return ['localhost', '127.0.0.1', '::1'].includes(new URL(process.env.DATABASE_URL || '').hostname); }
  catch { return false; }
})();
const localMutationGate = ['localhost', '127.0.0.1', '::1'].includes(base.hostname)
  && process.env.GOD_MODE_ALLOW_MUTATIONS === '1'
  && databaseIsLocal;

test.use({ baseURL });
test.setTimeout(90_000);

type SavedOrder = { id: string; orderCode: string; numericCode: number };
type LotFixture = { id: string; batchCode: string; productId: string };

function token(): string { return randomBytes(6).toString('hex').toUpperCase(); }
function absolute(path: string): string { return new URL(path, baseURL).toString(); }

async function loginAdmin(page: Page): Promise<void> {
  test.skip(!adminPassword, 'Set AUDIT_ADMIN_PASSWORD to run admin journeys.');
  await page.goto('/dang-nhap?callbackUrl=%2Fadmin%2Fdashboard', { waitUntil: 'domcontentloaded' });
  await page.getByLabel('Email').fill(adminEmail);
  await page.getByLabel('Mật khẩu').fill(adminPassword);
  await page.getByRole('button', { name: 'Đăng nhập' }).click();
  await expect(page).toHaveURL(/\/admin\/dashboard(?:\?|$)/, { timeout: 30_000 });
}

async function createOrderWithLot(): Promise<{ order: SavedOrder; lot: LotFixture }> {
  const lot = await prisma.productionLot.findFirst({
    where: { productVariantId: null, status: 'ACTIVE', availableQty: { gt: 0 }, expDate: { gt: new Date() }, product: { active: true, variants: { none: {} } } },
    select: { id: true, batchCode: true, productId: true },
  });
  expect(lot, 'A seeded active lot with available stock is required.').toBeTruthy();
  const product = await prisma.product.findUniqueOrThrow({ where: { id: lot!.productId }, select: { name: true, price: true, slug: true } });
  const unitPrice = product.price;
  const order = await prisma.$transaction(async (transaction) => {
    const stockClaim = await transaction.product.updateMany({ where: { id: lot!.productId, stock: { gte: 1 } }, data: { stock: { decrement: 1 } } });
    expect(stockClaim.count).toBe(1);
    const lotClaim = await transaction.productionLot.updateMany({ where: { id: lot!.id, status: 'ACTIVE', expDate: { gt: new Date() }, availableQty: { gte: 1 } }, data: { availableQty: { decrement: 1 } } });
    expect(lotClaim.count).toBe(1);
    return transaction.order.create({
      data: {
        orderCode: `MKF-${String(Math.floor(100000 + Math.random() * 900000))}`,
        customerName: `Playwright ${token()}`,
        phone: `076${String(Math.floor(Math.random() * 10_000_000)).padStart(7, '0')}`,
        address: 'Local Playwright fixture',
        orderStatus: 'PENDING',
        paymentMethod: 'COD',
        paymentStatus: 'PENDING',
        subtotal: unitPrice,
        shippingFee: 0,
        totalAmount: unitPrice,
        items: { create: [{
          productId: lot!.productId,
          productName: product.name,
          titleSnapshot: product.name,
          variantNameSnapshot: '',
          skuSnapshot: product.slug,
          quantity: 1,
          unitPrice,
          discountAllocated: 0,
          finalPrice: unitPrice,
          lineTotal: unitPrice,
          lotId: lot!.id,
          lotCode: lot!.batchCode,
        }] },
      },
      select: { id: true, orderCode: true, numericCode: true },
    });
  });
  return { order, lot: lot! };
}

async function cleanupOrder(order: SavedOrder | undefined): Promise<void> {
  if (!order) return;
  await prisma.$transaction(async (transaction) => {
    const savedOrder = await transaction.order.findUnique({ where: { id: order.id }, select: { customerId: true } });
    const items = await transaction.orderItem.findMany({ where: { orderId: order.id }, select: { productId: true, productVariantId: true, quantity: true, lotId: true } });
    for (const item of items) {
      await transaction.product.update({ where: { id: item.productId }, data: { stock: { increment: item.quantity } } });
      if (item.productVariantId) await transaction.productVariant.update({ where: { id: item.productVariantId }, data: { inventory: { increment: item.quantity } } });
      if (item.lotId) await transaction.productionLot.updateMany({ where: { id: item.lotId }, data: { availableQty: { increment: item.quantity } } });
    }
    await transaction.order.deleteMany({ where: { id: order.id } });
    if (savedOrder?.customerId) await transaction.customer.deleteMany({ where: { id: savedOrder.customerId, orders: { none: {} } } });
  });
}

async function clearBrowserCart(page: Page): Promise<void> {
  try {
    const response = await page.request.get(absolute('/api/cart'));
    if (!response.ok()) return;
    const cart = await response.json() as { items?: Array<{ id: string }> };
    for (const item of cart.items ?? []) {
      await page.request.delete(absolute('/api/cart/items'), { data: { itemId: item.id } }).catch(() => undefined);
    }
  } catch {
    return;
  }
}

test('Storefront home → product → cart drawer → checkout → VietQR and lot allocation', async ({ page }) => {
  test.skip(!localMutationGate, 'Checkout creates an order; enable only with localhost, local DATABASE_URL, and GOD_MODE_ALLOW_MUTATIONS=1.');
  const phone = `076${String(Math.floor(Math.random() * 10_000_000)).padStart(7, '0')}`;
  let orderCode = '';

  try {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.getByRole('link', { name: /mua ngay mẻ sấy mới/i }).click();
    await expect(page).toHaveURL(/\/products(?:\?|$)/);

    const productCard = page.locator('.product-card').filter({ has: page.locator('.artisan-quick-add') }).first();
    await expect(productCard).toBeVisible();
    const productName = (await productCard.locator('.product-name').innerText()).trim();
    await productCard.getByRole('button', { name: /thêm nhanh vào giỏ|quick add to cart/i }).click();

    const drawer = page.getByRole('dialog', { name: /giỏ hàng của bạn|your cart/i });
    await expect(drawer).toBeVisible();
    await expect(drawer).toContainText(productName);
    await drawer.locator('.cart-drawer-checkout').click();
    await expect(page).toHaveURL(/\/checkout(?:\?|$)/);

    await page.getByLabel('Họ tên').fill('Playwright Checkout');
    await page.getByLabel('Điện thoại').fill(phone);
    const province = page.locator('#province');
    await expect.poll(() => province.locator('option').count(), { timeout: 20_000 }).toBeGreaterThan(1);
    await province.selectOption({ index: 1 });
    const district = page.locator('#district');
    await expect.poll(() => district.locator('option').count(), { timeout: 20_000 }).toBeGreaterThan(1);
    await district.selectOption({ index: 1 });
    const ward = page.locator('#ward');
    await expect.poll(() => ward.locator('option').count(), { timeout: 20_000 }).toBeGreaterThan(1);
    await ward.selectOption({ index: 1 });
    await page.getByLabel(/số nhà, tên đường/i).fill('12 E2E Street');
    await page.locator('input[name="method"][value="VIETQR"]').check();

    const checkoutResponse = page.waitForResponse((response) => {
      const requestUrl = new URL(response.url());
      return requestUrl.pathname === '/api/checkout' && response.request().method() === 'POST';
    });
    await page.getByRole('button', { name: /đặt hàng|place order/i }).click();
    const response = await checkoutResponse;
    expect([200, 201]).toContain(response.status());
    const result = await response.json() as { orderId: string; orderCode: string; redirectUrl: string };
    orderCode = result.orderCode;
    expect(orderCode).toMatch(/^MKF-\d{6}$/);
    await expect(page).toHaveURL(/\/checkout\/vietqr\//, { timeout: 30_000 });
    await expect(page.getByRole('main')).toContainText(orderCode);
    await expect(page.getByRole('img', { name: /vietqr/i })).toBeVisible();
    await expect(page.getByRole('main')).toContainText(/15:|14:|phút|minutes/i);

    const persistedOrder = await prisma.order.findUniqueOrThrow({
      where: { id: result.orderId },
      include: { items: { include: { lot: true } } },
    });
    expect(persistedOrder.items.length).toBeGreaterThan(0);
    expect(persistedOrder.items.every((item) => item.lotId && item.lotCode && item.lot)).toBe(true);
    expect(persistedOrder.items.every((item) => item.lot!.expDate > new Date())).toBe(true);
  } finally {
    if (orderCode) {
      const order = await prisma.order.findUnique({ where: { orderCode }, select: { id: true, orderCode: true, numericCode: true } });
      await cleanupOrder(order ?? undefined);
    }
    await clearBrowserCart(page);
  }
});

test('FEFO checkout allocates the earliest-expiring active lot', async ({ page }) => {
  test.skip(!localMutationGate, 'Checkout and lot fixtures require localhost, a local DATABASE_URL, and GOD_MODE_ALLOW_MUTATIONS=1.');
  const now = new Date();
  const products = await prisma.product.findMany({
    where: { active: true, stock: { gt: 0 }, variants: { none: {} } },
    select: { id: true, slug: true, name: true, price: true },
  });
  let product: (typeof products)[number] | undefined;
  for (const candidate of products) {
    const activeLots = await prisma.productionLot.findMany({
      where: { productId: candidate.id, productVariantId: null, status: 'ACTIVE', availableQty: { gt: 0 }, expDate: { gt: now } },
      select: { expDate: true },
    });
    if (activeLots.every((lot) => lot.expDate.getTime() > now.getTime() + 30 * 60 * 1000)) {
      product = candidate;
      break;
    }
  }
  test.skip(!product, 'No active non-variant product has enough stock and a safe expiry window for FEFO fixtures.');

  const batchPrefix = `LOT-PW-FEFO-${token()}`;
  const earlyExpiry = new Date(Date.now() + 10 * 60 * 1000);
  const laterExpiry = new Date(Date.now() + 20 * 60 * 1000);
  const lots = await Promise.all([earlyExpiry, laterExpiry].map((expDate, index) => prisma.productionLot.create({
    data: {
      batchCode: `${batchPrefix}-${index + 1}`,
      qrToken: randomUUID(),
      productId: product!.id,
      mfgDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
      expDate,
      receivedQty: 1,
      availableQty: 1,
      status: 'ACTIVE',
    },
    select: { id: true, batchCode: true, expDate: true },
  })));
  const idempotencyKey = `PW-FEFO-${token()}`;
  let order: SavedOrder | undefined;
  let cartItemId: string | undefined;

  try {
    const cartResponse = await page.request.post(absolute('/api/cart/items'), { data: { productId: product!.id, quantity: 1 } });
    expect(cartResponse.status()).toBe(200);
    cartItemId = (await cartResponse.json() as { item: { id: string } }).item.id;
    const checkout = await page.request.post(absolute('/api/orders'), {
      headers: { 'idempotency-key': idempotencyKey },
      data: {
        customer: { name: 'Playwright FEFO', phone: `076${String(Math.floor(Math.random() * 10_000_000)).padStart(7, '0')}` },
        delivery: { address: 'Local FEFO test' },
        paymentMethod: 'COD',
        items: [{ id: cartItemId, productId: product!.id, productSlug: product!.slug, variantId: null, quantity: 1, price: product!.price }],
      },
    });
    expect([200, 201]).toContain(checkout.status());
    const result = await checkout.json() as { orderId: string };
    order = await prisma.order.findUniqueOrThrow({ where: { id: result.orderId }, select: { id: true, orderCode: true, numericCode: true } });
    const orderItem = await prisma.orderItem.findFirstOrThrow({ where: { orderId: order.id }, select: { lotId: true, lotCode: true } });
    expect(orderItem).toMatchObject({ lotId: lots[0].id, lotCode: lots[0].batchCode });
  } finally {
    if (!order) order = await prisma.order.findUnique({ where: { idempotencyKey }, select: { id: true, orderCode: true, numericCode: true } }) ?? undefined;
    await cleanupOrder(order);
    if (cartItemId) await page.request.delete(absolute('/api/cart/items'), { data: { itemId: cartItemId } }).catch(() => undefined);
    await prisma.inventoryMovement.deleteMany({ where: { lotId: { in: lots.map((lot) => lot.id) } } });
    await prisma.productionLot.deleteMany({ where: { id: { in: lots.map((lot) => lot.id) } } });
  }
});

test('Admin order manager displays the allocated LotCode', async ({ page }) => {
  test.skip(!localMutationGate, 'Requires a disposable local order fixture.');
  const { order, lot } = await createOrderWithLot();
  try {
    await loginAdmin(page);
    await page.goto(`/admin/orders?search=${encodeURIComponent(order.orderCode)}`, { waitUntil: 'domcontentloaded' });
    const orderCard = page.locator('.admin-order').filter({ hasText: order.orderCode });
    await expect(orderCard).toBeVisible();
    await expect(orderCard).toContainText(lot.batchCode);
  } finally {
    await cleanupOrder(order);
  }
});

test('Admin can open and print the A5 delivery slip', async ({ page }) => {
  test.skip(!localMutationGate, 'Printing a fixture order is enabled only on a disposable local database.');
  const { order } = await createOrderWithLot();
  await page.addInitScript(() => {
    const testWindow = window as Window & { __e2ePrintCalls?: number };
    testWindow.__e2ePrintCalls = 0;
    testWindow.print = () => { testWindow.__e2ePrintCalls = (testWindow.__e2ePrintCalls ?? 0) + 1; };
  });
  try {
    await loginAdmin(page);
    await page.goto(`/admin/orders?search=${encodeURIComponent(order.orderCode)}`, { waitUntil: 'domcontentloaded' });
    const orderCard = page.locator('.admin-order').filter({ hasText: order.orderCode });
    await expect(orderCard).toBeVisible();
    await orderCard.getByRole('link', { name: /in phiếu/i }).click();
    await expect(page.locator('#printable-order')).toContainText(order.orderCode);
    await page.getByRole('button', { name: 'In phiếu giao hàng' }).click();
    expect(await page.evaluate(() => (window as Window & { __e2ePrintCalls?: number }).__e2ePrintCalls)).toBe(1);
    await page.emulateMedia({ media: 'print' });
    await expect(page.locator('#printable-order')).toBeVisible();
    const pageRules = (await page.locator('style').allTextContents()).join('\n');
    expect(pageRules).toMatch(/@page\s*\{[^}]*size:\s*A5\b/is);
  } finally {
    await cleanupOrder(order);
  }
});

test('WMS displays current lot availability and stock counts', async ({ page }) => {
  test.skip(!adminPassword, 'Set AUDIT_ADMIN_PASSWORD for the read-only WMS journey.');
  await loginAdmin(page);
  const response = await page.request.get(absolute('/api/admin/inventory'));
  expect(response.status()).toBe(200);
  const payload = await response.json() as { items: Array<{ stock: number; productionLots: Array<{ batchCode: string; availableQty: number; receivedQty: number; status: string }> }> };
  const lot = payload.items.flatMap((item) => item.productionLots).find((candidate) => candidate.availableQty > 0 && candidate.status === 'ACTIVE');
  expect(lot, 'An active lot with remaining quantity must be seeded for the WMS smoke test.').toBeTruthy();

  await page.goto('/admin/inventory', { waitUntil: 'domcontentloaded' });
  const lotRow = page.getByRole('row').filter({ hasText: lot!.batchCode });
  await expect(lotRow).toBeVisible();
  await expect(lotRow).toContainText(`${lot!.availableQty}/${lot!.receivedQty} khả dụng`);
  await expect(page.getByText('Khả dụng bán (ATP)')).toBeVisible();
});

test.afterAll(async () => { await prisma.$disconnect(); });