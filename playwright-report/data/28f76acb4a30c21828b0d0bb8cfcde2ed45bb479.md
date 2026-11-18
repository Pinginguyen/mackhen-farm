# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 01_admin_enterprise.spec.ts >> 04 Order list safely serializes BigInt-sized money values without a 500
- Location: tests\e2e\01_admin_enterprise.spec.ts:101:5

# Error details

```
Error: Set AUDIT_ADMIN_PASSWORD to run authenticated admin checks.

expect(received).not.toBe(expected) // Object.is equality

Expected: not ""
```

# Test source

```ts
  1   | import 'dotenv/config';
  2   | 
  3   | import { randomBytes } from 'node:crypto';
  4   | import { expect, test, type Page } from '@playwright/test';
  5   | import { createOrderChecksum } from '../../lib/crypto-order';
  6   | import { prisma } from '../../lib/prisma';
  7   | 
  8   | const baseURL = process.env.E2E_BASE_URL || process.env.AUDIT_BASE_URL || 'http://localhost:3000';
  9   | const base = new URL(baseURL);
  10  | const adminEmail = process.env.AUDIT_ADMIN_EMAIL || 'admin@mackhenfarm.vn';
  11  | const adminPassword = process.env.AUDIT_ADMIN_PASSWORD || '';
  12  | const databaseIsLocal = (() => {
  13  |   try { return ['localhost', '127.0.0.1', '::1'].includes(new URL(process.env.DATABASE_URL || '').hostname); }
  14  |   catch { return false; }
  15  | })();
  16  | const mutationsAllowed = ['localhost', '127.0.0.1', '::1'].includes(base.hostname)
  17  |   && process.env.GOD_MODE_ALLOW_MUTATIONS === '1'
  18  |   && databaseIsLocal;
  19  | 
  20  | test.use({ baseURL });
  21  | test.setTimeout(45_000);
  22  | 
  23  | type FixtureOrder = { id: string; orderCode: string; numericCode: number };
  24  | 
  25  | function uniqueToken(): string {
  26  |   return randomBytes(6).toString('hex').toUpperCase();
  27  | }
  28  | 
  29  | async function loginAdmin(page: Page): Promise<void> {
> 30  |   expect(adminPassword, 'Set AUDIT_ADMIN_PASSWORD to run authenticated admin checks.').not.toBe('');
      |                                                                                            ^ Error: Set AUDIT_ADMIN_PASSWORD to run authenticated admin checks.
  31  |   const response = await page.request.post(new URL('/api/auth/login', baseURL).toString(), {
  32  |     data: { email: adminEmail, password: adminPassword },
  33  |   });
  34  |   expect(response.ok(), `Admin login failed with HTTP ${response.status()}`).toBeTruthy();
  35  | }
  36  | 
  37  | async function createOrderFixture(overrides: { paymentMethod?: 'COD' | 'VIETQR'; orderStatus?: 'PENDING' | 'DELIVERED'; totalAmount?: number } = {}): Promise<FixtureOrder> {
  38  |   const token = uniqueToken();
  39  |   const product = await prisma.product.findFirst({ where: { active: true }, select: { id: true, name: true, price: true } });
  40  |   expect(product, 'A seeded active product is required for order fixtures.').toBeTruthy();
  41  |   const order = await prisma.order.create({
  42  |     data: {
  43  |       orderCode: `MKF-${String(Math.floor(100000 + Math.random() * 900000))}`,
  44  |       customerName: `Playwright ${token}`,
  45  |       phone: '0762793244',
  46  |       address: 'Local Playwright fixture',
  47  |       orderStatus: overrides.orderStatus ?? 'PENDING',
  48  |       paymentMethod: overrides.paymentMethod ?? 'COD',
  49  |       paymentStatus: overrides.orderStatus === 'DELIVERED' ? 'PAID' : 'PENDING',
  50  |       subtotal: overrides.totalAmount ?? product!.price,
  51  |       shippingFee: 0,
  52  |       totalAmount: overrides.totalAmount ?? product!.price,
  53  |       items: { create: [{ productId: product!.id, productName: product!.name, titleSnapshot: product!.name, variantNameSnapshot: '', skuSnapshot: product!.id, quantity: 1, unitPrice: product!.price, discountAllocated: 0, finalPrice: product!.price, lineTotal: product!.price }] },
  54  |     },
  55  |     select: { id: true, orderCode: true, numericCode: true },
  56  |   });
  57  |   return order;
  58  | }
  59  | 
  60  | async function removeOrderFixture(order: FixtureOrder | undefined): Promise<void> {
  61  |   if (order) await prisma.order.deleteMany({ where: { id: order.id } });
  62  | }
  63  | 
  64  | test('01 Login Admin & Session Guard redirects unauthenticated users', async ({ page }) => {
  65  |   await page.goto('/admin/dashboard', { waitUntil: 'domcontentloaded' });
  66  |   await expect.poll(() => new URL(page.url()).pathname).toMatch(/dang-nhap|login/);
  67  |   await loginAdmin(page);
  68  |   const response = await page.goto('/admin/dashboard', { waitUntil: 'domcontentloaded' });
  69  |   expect(response?.status()).toBeLessThan(400);
  70  |   await expect(page.getByRole('heading', { name: /hoạt động cửa hàng/i })).toBeVisible();
  71  | });
  72  | 
  73  | test('02 Dashboard APM and Neon PostgreSQL connection health are exposed', async ({ page }) => {
  74  |   await loginAdmin(page);
  75  |   const response = await page.request.get(new URL('/api/admin/monitoring', baseURL).toString());
  76  |   expect(response.status()).toBe(200);
  77  |   const payload = await response.json() as { database: string; databaseLatencyMs: number | null; connectionPooler: string };
  78  |   expect(payload.database).toBe('healthy');
  79  |   expect(payload.databaseLatencyMs).toBeGreaterThanOrEqual(0);
  80  |   expect(['pooler-configured', 'pooler-not-detected']).toContain(payload.connectionPooler);
  81  |   await page.goto('/admin/settings?tab=monitoring', { waitUntil: 'domcontentloaded' });
  82  |   await expect(page.locator('main')).toContainText(/Neon|PostgreSQL|connection pool|kết nối/i);
  83  | });
  84  | 
  85  | test('03 ATP inventory returns Physical, Reserved, and Available as a consistent equation', async ({ page }) => {
  86  |   await loginAdmin(page);
  87  |   const response = await page.request.get(new URL('/api/admin/inventory', baseURL).toString());
  88  |   expect(response.status()).toBe(200);
  89  |   const payload = await response.json() as { items: Array<{ stock: number; committed: number; available: number }> };
  90  |   expect(payload.items.length).toBeGreaterThan(0);
  91  |   for (const item of payload.items) {
  92  |     expect(Number.isSafeInteger(item.stock)).toBe(true);
  93  |     expect(Number.isSafeInteger(item.committed)).toBe(true);
  94  |     expect(Number.isSafeInteger(item.available)).toBe(true);
  95  |     expect(item.available).toBe(item.stock - item.committed);
  96  |   }
  97  |   await page.goto('/admin/inventory', { waitUntil: 'domcontentloaded' });
  98  |   await expect(page.locator('main')).toContainText(/Tồn thực tế|Đang giữ|Khả dụng|ATP/i);
  99  | });
  100 | 
  101 | test('04 Order list safely serializes BigInt-sized money values without a 500', async ({ page }) => {
  102 |   await loginAdmin(page);
  103 |   const response = await page.request.get(new URL('/api/admin/orders', baseURL).toString());
  104 |   expect(response.status()).toBe(200);
  105 |   const payload = await response.json() as { items: Array<{ orderCode: string; total: number }> };
  106 |   expect(Array.isArray(payload.items)).toBe(true);
  107 |   for (const order of payload.items) {
  108 |     expect(order.orderCode).toMatch(/^MKF-\d{6}$/);
  109 |     expect(Number.isSafeInteger(order.total)).toBe(true);
  110 |     expect(BigInt(order.total).toString()).toBe(String(order.total));
  111 |   }
  112 | });
  113 | 
  114 | test('05 FSM rejects skipped order transitions and accepts the next valid state', async ({ page }) => {
  115 |   test.skip(!mutationsAllowed, 'Requires localhost, DATABASE_URL, and GOD_MODE_ALLOW_MUTATIONS=1.');
  116 |   await loginAdmin(page);
  117 |   const order = await createOrderFixture();
  118 |   try {
  119 |     const jump = await page.request.patch(new URL('/api/admin/orders', baseURL).toString(), { data: { orderCode: order.orderCode, status: 'DELIVERED' } });
  120 |     expect(jump.status()).toBe(409);
  121 |     const next = await page.request.patch(new URL('/api/admin/orders', baseURL).toString(), { data: { orderCode: order.orderCode, status: 'CONFIRMED' } });
  122 |     expect(next.status()).toBe(200);
  123 |     const persisted = await prisma.order.findUniqueOrThrow({ where: { id: order.id }, select: { orderStatus: true } });
  124 |     expect(persisted.orderStatus).toBe('CONFIRMED');
  125 |   } finally {
  126 |     await removeOrderFixture(order);
  127 |   }
  128 | });
  129 | 
  130 | test('06 Invoice print renders a barcode and SHA-256 checksum', async ({ page }) => {
```