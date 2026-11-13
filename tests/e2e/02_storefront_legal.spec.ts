import dotenv from 'dotenv';
import { randomBytes } from 'node:crypto';
import { expect, test, type Page } from '@playwright/test';
import { prisma } from '../../lib/prisma';
import { convertVndToSgdCents, formatSgdCents } from '../../lib/money';

dotenv.config({ path: '.env.local' });
dotenv.config();

const baseURL = process.env.AUDIT_BASE_URL || 'http://localhost:3000';
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
test.setTimeout(60_000);

type Product = { id: string; slug: string; name: string; category: string; price: number; stock?: number };
type CreatedOrder = { id: string; orderCode: string; numericCode: number };

function token(): string { return randomBytes(6).toString('hex').toUpperCase(); }
function absolute(path: string): string { return new URL(path, baseURL).toString(); }

async function productsFrom(page: Page): Promise<Product[]> {
  const response = await page.request.get(absolute('/api/products'));
  expect(response.status()).toBe(200);
  const payload: unknown = await response.json();
  const rows = Array.isArray(payload) ? payload : (payload as { items?: Product[] }).items ?? [];
  return rows as Product[];
}

async function addItem(page: Page, product: Product, quantity = 1): Promise<{ id: string; quantity: number; price: number }> {
  const response = await page.request.post(absolute('/api/cart/items'), { data: { productId: product.id, quantity } });
  expect(response.status()).toBe(200);
  const result = await response.json() as { item: { id: string; quantity: number }; totals: { subtotal: number } };
  return { ...result.item, price: product.price };
}

async function cleanupOrder(order: CreatedOrder | undefined): Promise<void> {
  if (!order) return;
  await prisma.$transaction(async (tx) => {
    const owner = await tx.order.findUnique({ where: { id: order.id }, select: { customerId: true } });
    const items = await tx.orderItem.findMany({ where: { orderId: order.id }, select: { productId: true, productVariantId: true, quantity: true, lotCode: true } });
    for (const item of items) {
      await tx.product.update({ where: { id: item.productId }, data: { stock: { increment: item.quantity } } });
      if (item.productVariantId) await tx.productVariant.update({ where: { id: item.productVariantId }, data: { inventory: { increment: item.quantity } } });
      if (item.lotCode) await tx.productionLot.updateMany({ where: { lotCode: item.lotCode }, data: { availableQty: { increment: item.quantity } } });
    }
    await tx.order.delete({ where: { id: order.id } });
    if (owner?.customerId) await tx.customer.deleteMany({ where: { id: owner.customerId, orders: { none: {} } } });
  });
}

async function createDeliveredReviewOrder(product: Product): Promise<CreatedOrder> {
  const code = Math.floor(100000 + Math.random() * 900000);
  return prisma.order.create({
    data: {
      orderCode: `MKF-${code}`, customerName: `Review QA ${token()}`, phone: '0762793244', address: 'Local review fixture',
      orderStatus: 'DELIVERED', paymentMethod: 'COD', paymentStatus: 'PAID', subtotal: product.price, shippingFee: 0,
      totalAmount: product.price, items: { create: [{ productId: product.id, productName: product.name, quantity: 1, price: product.price, lineTotal: product.price }] },
    },
    select: { id: true, orderCode: true, numericCode: true },
  });
}

async function purchaseAndDeliverReviewOrder(page: Page, product: Product): Promise<CreatedOrder> {
  expect(adminPassword, 'Set AUDIT_ADMIN_PASSWORD to fulfill the review test order.').not.toBe('');
  const cartResponse = await page.request.post(absolute('/api/cart/items'), { data: { productId: product.id, quantity: 1 } });
  expect(cartResponse.status()).toBe(200);
  const cartItem = (await cartResponse.json() as { item: { id: string } }).item;
  const checkout = await page.request.post(absolute('/api/orders'), {
    headers: { 'idempotency-key': `PW-REVIEW-${token()}` },
    data: {
      customer: { name: 'Playwright Verified Buyer', phone: '0762793244', email: `pw-review-${token().toLowerCase()}@example.invalid` },
      delivery: { address: 'Local verified review test' }, paymentMethod: 'COD',
      items: [{ id: cartItem.id, quantity: 1, price: product.price }],
    },
  });
  expect([200, 201]).toContain(checkout.status());
  const result = await checkout.json() as { orderId: string };
  const order = await prisma.order.findUniqueOrThrow({ where: { id: result.orderId }, select: { id: true, orderCode: true, numericCode: true } });
  const login = await page.request.post(absolute('/api/auth/login'), { data: { email: adminEmail, password: adminPassword } });
  expect(login.ok(), `Admin login returned HTTP ${login.status()}`).toBeTruthy();
  const transitions: Array<{ status: string; carrier?: string; trackingCode?: string }> = [
    { status: 'CONFIRMED' },
    { status: 'PROCESSING' },
    { status: 'HANDED_OFF', carrier: 'SPX', trackingCode: `PW${token()}` },
    { status: 'SHIPPING', carrier: 'SPX', trackingCode: `PW${token()}` },
    { status: 'DELIVERED' },
  ];
  for (const transition of transitions) {
    const response = await page.request.patch(absolute('/api/admin/orders'), { data: { orderCode: order.orderCode, ...transition } });
    expect(response.status(), `Failed order transition to ${transition.status}`).toBe(200);
  }
  await page.request.delete(absolute('/api/cart/items'), { data: { itemId: cartItem.id } }).catch(() => undefined);
  return order;
}

test('01 Hydration Guardian reports no React 418, 423, or 425 on storefront routes', async ({ page }) => {
  const hydrationErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error' && /Minified React error #(?:418|423|425)/i.test(message.text())) hydrationErrors.push(message.text());
  });
  page.on('pageerror', (error) => {
    if (/Minified React error #(?:418|423|425)/i.test(error.message)) hydrationErrors.push(error.message);
  });
  for (const path of ['/', '/san-pham', '/chinh-sach-bao-mat']) {
    const response = await page.goto(path, { waitUntil: 'domcontentloaded' });
    expect(response?.status(), `Failed to load ${path}`).toBeLessThan(400);
    await expect(page.getByRole('main')).toBeVisible();
  }
  expect(hydrationErrors, hydrationErrors.join('\n')).toEqual([]);
});

test('02 Catalog search and dynamic category filters narrow the product list', async ({ page }) => {
  await page.goto('/san-pham', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('main')).toBeVisible();
  const search = page.getByRole('textbox', { name: /tìm trong danh mục/i });
  await expect(search).toBeVisible();
  const productCards = page.getByRole('article');
  const initialCount = await productCards.count();
  expect(initialCount).toBeGreaterThan(0);
  await page.getByRole('tab', { name: /gia vị|spice/i }).click();
  const spiceProducts = (await productsFrom(page)).filter((product) => product.category === 'Gia vị Tây Bắc');
  expect(spiceProducts.length).toBeGreaterThan(0);
  await search.fill('no-such-product-playwright');
  await expect(productCards).toHaveCount(0);
  await search.fill(spiceProducts[0].name);
  await expect(productCards).toHaveCount(1);
});

test.describe('Local database mutations', () => {
  test.skip(!mutationsAllowed, 'Requires a local DATABASE_URL and GOD_MODE_ALLOW_MUTATIONS=1.');

test('03 Cart shipping and free-shipping threshold are calculated by server APIs', async ({ page }) => {
  const products = await productsFrom(page);
  const product = products.find((item) => item.stock === undefined || item.stock > 0);
  expect(product).toBeTruthy();
  const added = await addItem(page, product!);
  try {
    const cart = await page.request.get(absolute('/api/cart'));
    expect(cart.status()).toBe(200);
    const data = await cart.json() as { subtotal: number; shipping: number; total: number; freeShippingThreshold: number };
    expect(data.subtotal).toBe(product!.price);
    expect(data.total).toBe(data.subtotal + data.shipping);
    expect(Number.isSafeInteger(data.freeShippingThreshold)).toBe(true);
    expect(data.shipping).toBeGreaterThanOrEqual(0);
  } finally {
    await page.request.delete(absolute('/api/cart/items'), { data: { itemId: added.id } });
  }
});

test('04 VietQR checkout creates an MB Bank QR page with amount and expiry countdown', async ({ page }) => {
  const product = (await productsFrom(page)).find((item) => item.stock === undefined || item.stock > 0);
  expect(product).toBeTruthy();
  const cartItem = await addItem(page, product!);
  let order: CreatedOrder | undefined;
  try {
    const response = await page.request.post(absolute('/api/orders'), {
      headers: { 'idempotency-key': `PW-VIETQR-${token()}` },
      data: {
        customer: { name: 'Playwright VietQR', phone: '0762793244', email: `pw-${token().toLowerCase()}@example.invalid` },
        delivery: { address: 'Local test address' }, paymentMethod: 'VIETQR', items: [{ id: cartItem.id, quantity: 1, price: product!.price }],
      },
    });
    expect([200, 201]).toContain(response.status());
    const result = await response.json() as { orderId: string; orderCode: string; totalAmount?: number; redirectUrl: string };
    order = await prisma.order.findUniqueOrThrow({ where: { id: result.orderId }, select: { id: true, orderCode: true, numericCode: true } });
    expect(result.orderCode).toMatch(/^MKF-\d{6}$/);
    expect(result.redirectUrl).toContain(`/checkout/vietqr/${result.orderCode}`);
    await page.goto(result.redirectUrl, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('main')).toContainText(new RegExp(result.orderCode));
    await expect(page.getByRole('main')).toContainText(/MB|VietQR|QR/i);
    await expect(page.getByRole('main')).toContainText(/15:|14:|phút|minutes|countdown/i);
    const qrSource = await page.getByRole('img', { name: /VietQR/i }).getAttribute('src');
    expect(qrSource).toContain('/image/MB-');
  } finally {
    await cleanupOrder(order);
    await page.request.delete(absolute('/api/cart/items'), { data: { itemId: cartItem.id } }).catch(() => undefined);
  }
});

test('05 Verified five-star review waits for the localized status message, not an outdated toast', async ({ page }) => {
  test.skip(!adminPassword, 'Set AUDIT_ADMIN_PASSWORD to fulfill the review test order.');
  const product = (await productsFrom(page))[0];
  expect(product).toBeTruthy();
  const order = await purchaseAndDeliverReviewOrder(page, product!);
  try {
    await page.goto(`/products/${encodeURIComponent(product!.slug)}?review=1&orderCode=${order.orderCode}&phone=0762793244#product-reviews-title`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /đánh giá sản phẩm|product review/i })).toBeVisible();
    await page.getByRole('textbox', { name: /họ và tên|full name/i }).fill('Playwright Verified Buyer');
    await page.getByRole('textbox', { name: /số điện thoại đặt hàng|order phone number/i }).fill('0762793244');
    await page.getByRole('textbox', { name: /mã đơn hàng|order number/i }).fill(order.orderCode);
    await page.getByRole('button', { name: /5 sao|5 stars/i }).click();
    await page.getByRole('textbox', { name: /bình luận|review/i }).fill(`Verified five-star E2E review ${token()}`);
    const createdReview = page.waitForResponse((response) => response.url().includes('/api/reviews') && response.request().method() === 'POST');
    await page.getByRole('button', { name: /gửi đánh giá|submit review/i }).click();
    expect((await createdReview).status()).toBe(201);
    await expect(page.getByRole('status').filter({ hasText: /cảm ơn bạn! đánh giá của bạn đã được thêm ngay lập tức|thank you! your review has been added/i })).toBeVisible({ timeout: 5_000 });
    const persisted = await prisma.review.findUnique({ where: { orderId_productId: { orderId: order.id, productId: product!.id } } });
    expect(persisted?.rating).toBe(5);
  } finally {
    await prisma.review.deleteMany({ where: { orderId: order.id } });
    await cleanupOrder(order);
  }
});

test('06 Order tracking page displays its SHA-256 integrity seal', async ({ page }) => {
  const product = (await productsFrom(page))[0];
  expect(product).toBeTruthy();
  const order = await createDeliveredReviewOrder(product!);
  try {
    await page.goto('/tra-cuu', { waitUntil: 'domcontentloaded' });
    await page.getByRole('textbox', { name: /mã đơn hàng/i }).fill(order.orderCode);
    await page.getByRole('textbox', { name: /số điện thoại/i }).fill('0762793244');
    await page.getByRole('button', { name: /tra cứu đơn hàng|track order/i }).click();
    const tracked = page.getByRole('article').filter({ hasText: order.orderCode });
    await expect(tracked).toBeVisible();
    await expect(tracked.getByRole('region', { name: /mã đối chiếu toàn vẹn sha-256/i })).toBeVisible();
    await expect(tracked).toContainText(order.orderCode);
  } finally {
    await prisma.review.deleteMany({ where: { orderId: order.id } });
    await prisma.order.deleteMany({ where: { id: order.id } });
  }
});
});

test('07 Traceability lookup exposes lot details and four supply-chain stages', async ({ page }) => {
  const batchCode = 'PW-BATCH-LEGAL-001';
  await page.route(`**/api/traceability/${batchCode}`, (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      success: true,
      data: {
        batchCode,
        productName: 'Playwright Traceability Product',
        manufacturingDate: '01/11/2026',
        expiryDate: '01/11/2027',
        steps: Array.from({ length: 4 }, (_, index) => ({ label: `Stage ${index + 1}`, detail: `Fixture detail ${index + 1}` })),
      },
    }),
  }));
  await page.goto('/truy-xuat', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('main')).toBeVisible();
  await page.waitForLoadState('networkidle');
  await page.getByPlaceholder(/nhập mã lô in trên bao bì/i).fill(batchCode);
  const traceabilityResponse = page.waitForResponse((response) => response.url().includes(`/api/traceability/${batchCode}`));
  await page.getByRole('button', { name: /^tra cứu$/i }).click();
  expect((await traceabilityResponse).status()).toBe(200);
  await expect(page.getByRole('main')).toContainText(batchCode);
  await expect(page.getByRole('listitem').filter({ hasText: /STAGE 0[1-4]|CÔNG ĐOẠN 0[1-4]/ })).toHaveCount(4);
});

test('08 SGD cents conversion and VND integer formatting preserve precision', async ({ page }) => {
  expect(convertVndToSgdCents(1_000_000, 18_500)).toBe(5_405);
  expect(formatSgdCents(5_405)).toBe('54.05');
  expect(convertVndToSgdCents(-1_000_000, 18_500)).toBe(-5_405);
  await page.addInitScript(() => localStorage.setItem('mackhen_locale_currency', JSON.stringify({ locale: 'en', currency: 'SGD' })));
  await page.goto('/san-pham', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('main')).toContainText(/SGD|S\$/);
  await expect(page.getByRole('article').first()).toContainText(/SGD|S\$/);
});

test.describe('Local inquiry mutation', () => {
  test.skip(!mutationsAllowed, 'Requires a local DATABASE_URL and GOD_MODE_ALLOW_MUTATIONS=1.');

test('09 Singapore B2B inquiry form submits and confirms success', async ({ page }) => {
  await page.goto('/hop-tac-b2b', { waitUntil: 'domcontentloaded' });
  await page.getByRole('textbox', { name: /tên công ty/i }).fill(`PW Singapore ${token()}`);
  await page.getByRole('combobox', { name: /quốc gia/i }).selectOption('Singapore');
  await page.getByRole('textbox', { name: /người liên hệ/i }).fill('Playwright QA');
  await page.getByRole('textbox', { name: /điện thoại/i }).fill('+65 6123 4567');
  await page.getByRole('textbox', { name: 'Email' }).fill(`pw-${token().toLowerCase()}@example.invalid`);
  await page.getByRole('textbox', { name: /mức đặt hàng tối thiểu dự kiến/i }).fill('500 packs per month');
  let inquiryId = '';
  try {
    const submitted = page.waitForResponse((response) => response.url().includes('/api/b2b/inquiries') && response.request().method() === 'POST');
    await page.getByRole('button', { name: /gửi yêu cầu|submit/i }).click();
    const response = await submitted;
    expect([200, 201]).toContain(response.status());
    inquiryId = (await response.json() as { id: string }).id;
    await expect(page.getByRole('status')).toContainText(/yêu cầu đã được ghi nhận|request has been received/i);
  } finally {
    if (inquiryId) await prisma.b2bInquiry.deleteMany({ where: { id: inquiryId } });
  }
});
});

test('10 Privacy policy includes Decree 13 and required company contact disclosures', async ({ page }) => {
  await page.goto('/chinh-sach-bao-mat', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('main')).toBeVisible();
  const content = await page.getByRole('main').innerText();
  expect(content).toMatch(/Nghị định 13|Decree 13|13\/2023\/NĐ-CP/i);
  expect(content).toMatch(/0762|hotline|contact@mackhenfarm.vn/i);
  expect(content).toContain('trungchau1210@gmail.com');
  expect(content).toMatch(/CÔNG TY|MẮC KHÉN FARM|Mack Khen Farm/i);
});

test('11 Public footer displays company disclosures and the Ministry of Industry and Trade notice', async ({ page }) => {
  await page.goto('/chinh-sach-bao-mat', { waitUntil: 'domcontentloaded' });
  const footer = page.getByRole('contentinfo');
  await expect(footer).toBeVisible();
  await expect(footer).toContainText(/CÔNG TY|MẮC KHÉN FARM/i);
  await expect(footer).toContainText(/Mã số thuế/i);
  await expect(footer).toContainText(/Người đại diện/i);
  await expect(footer.getByRole('link', { name: /đã thông báo bộ công thương/i })).toHaveAttribute('href', 'http://online.gov.vn');
  await expect(footer.getByRole('link', { name: /điều khoản dịch vụ/i })).toHaveAttribute('href', '/terms');
});

test('12 Terms of Service explains ordering, payments, returns, intellectual property, and complaints', async ({ page }) => {
  await page.goto('/terms', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: /điều khoản dịch vụ/i, level: 1 })).toBeVisible();
  const terms = page.getByTestId('terms-content');
  await expect(terms).toContainText(/đặt hàng và xác nhận/i);
  await expect(terms).toContainText(/thanh toán và giao nhận/i);
  await expect(terms).toContainText(/nông sản tươi|nông sản khô/i);
  await expect(terms).toContainText(/quyền sở hữu trí tuệ/i);
  await expect(terms).toContainText(/khiếu nại và giải quyết tranh chấp/i);
});

test.afterAll(async () => { await prisma.$disconnect(); });