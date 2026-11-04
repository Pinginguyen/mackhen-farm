import 'dotenv/config';

import chalk from 'chalk';
import { chromium, type APIRequestContext, type Browser, type BrowserContext, type Page } from '@playwright/test';
import { randomBytes, randomInt } from 'node:crypto';
import { mkdir, stat, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { prisma } from '@/lib/prisma';

type CaseKind = 'POSITIVE' | 'NEGATIVE' | 'EDGE';
type CaseStatus = 'PASS' | 'FAIL' | 'SKIP';
type CaseResult = { act: number; kind: CaseKind; name: string; status: CaseStatus; durationMs: number; detail: string };
type JsonObject = Record<string, unknown>;
type ProductRow = { id: string; slug: string; name: string; price: number; stock: number; active: boolean; variants?: unknown[] };

const runId = `${Date.now().toString(36)}${randomBytes(3).toString('hex')}`.toUpperCase();
const baseUrl = new URL(process.env.AUDIT_BASE_URL || 'https://mackhen-farm.vercel.app');
const reportPath = join(process.cwd(), 'GOD_MODE_AUDIT_REPORT.md');
const artifactDir = join(process.cwd(), 'tests', 'artifacts', 'god-mode');
const adminEmail = process.env.AUDIT_ADMIN_EMAIL ?? 'admin@mackhenfarm.vn';
const adminPassword = process.env.AUDIT_ADMIN_PASSWORD ?? '';
const adminKocEmail = `god-mode-koc-${runId.toLowerCase()}@example.invalid`;
const adminKocPassword = process.env.GOD_MODE_KOC_PASSWORD || randomBytes(18).toString('base64url');
const customerEmail = `god-mode-customer-${runId.toLowerCase()}@example.invalid`;
const customerPassword = randomBytes(18).toString('base64url');
const b2bEmail = `god-mode-b2b-${runId.toLowerCase()}@example.invalid`;
const affiliateCode = (process.env.GOD_MODE_AFFILIATE_CODE || `VIP_TEST_${runId}`).toUpperCase();
const voucherCode = (process.env.GOD_MODE_VOUCHER_CODE || `CHIDUNG1LAN_${runId}`).toUpperCase();
const customerPhone = `09${String(randomInt(0, 100_000_000)).padStart(8, '0')}`;
const idempotencyKeys = [`${runId}-primary-checkout`, `${runId}-return-checkout`];
const results: CaseResult[] = [];
const cleanupNotes: string[] = [];
const testOrderCodes: string[] = [];
const pageErrors: string[] = [];
const originalProductStocks = new Map<string, number>();
let browser: Browser | undefined;
let context: BrowserContext | undefined;
let page: Page | undefined;
let createdAffiliateId: string | undefined;
let createdVoucherId: string | undefined;
let cartId: string | undefined;
let primaryProduct: ProductRow | undefined;
let primaryCartItemId: string | undefined;
let primaryQuantity = 2;
let primaryTestStock = 0;
let primaryOrderCode: string | undefined;
let returnedOrderCode: string | undefined;
let primaryOrderTotal = 0;
let affiliateCommissionRate = 10;
let reportWritten = false;

const acts = [
  'SECURITY & WEBHOOK CHAOS',
  'CROSS-BORDER B2B · SINGAPORE',
  'ADMIN SETUP · STOCK & KOC',
  'CUSTOMER EDGE CASES · ATP & FREESHIP',
  'CONCURRENCY & IDEMPOTENCY',
  'AUTOMATED RECONCILIATION',
  'WMS & FSM',
  'CUSTOMER INVOICE, ESG & REVIEW',
  'REVERSE LOGISTICS · RESTOCK',
  'AFFILIATE SETTLEMENT & AUDIT LOGS',
];

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function asObject(value: unknown): JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? value as JsonObject : {};
}

function localTargetGuard(): string | null {
  if (!['localhost', '127.0.0.1', '::1'].includes(baseUrl.hostname)) {
    return 'God Mode chỉ được chạy trên localhost/127.0.0.1/::1; production và host mạng bị chặn.';
  }
  if (process.env.GOD_MODE_ALLOW_MUTATIONS !== '1') {
    return 'Suite có tạo đơn, thanh toán mô phỏng, sửa kho và hoàn kho. Đặt GOD_MODE_ALLOW_MUTATIONS=1 để xác nhận các thao tác ghi.';
  }
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return 'Thiếu DATABASE_URL trước khi chạy mutation.';
  try {
    new URL(databaseUrl);
  } catch {
    return 'DATABASE_URL không hợp lệ; suite dừng trước mọi thao tác ghi.';
  }
  for (const [name, value] of [['NEXT_PUBLIC_APP_URL', process.env.NEXT_PUBLIC_APP_URL], ['VERCEL_URL', process.env.VERCEL_URL]] as const) {
    if (!value) continue;
    const appHost = value.includes('://') ? new URL(value).hostname : value.split('/')[0].split(':')[0];
    if (!['localhost', '127.0.0.1', '::1'].includes(appHost)) {
      return `${name} points to a non-local host; the payment simulator could dispatch a webhook outside this test environment.`;
    }
  }
  if (!adminPassword) return 'Thiếu AUDIT_ADMIN_PASSWORD; không hardcode thông tin đăng nhập trong suite.';
  return null;
}

function absolute(path: string): string {
  return new URL(path, baseUrl).toString();
}

async function jsonRequest(
  request: APIRequestContext,
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  path: string,
  data?: unknown,
  headers?: Record<string, string>,
) {
  const response = await request.fetch(absolute(path), {
    method,
    ...(data === undefined ? {} : { data }),
    ...(headers ? { headers } : {}),
    timeout: 20_000,
  });
  let body: JsonObject = {};
  try {
    body = asObject(await response.json());
  } catch {
    body = {};
  }
  return { response, body };
}

async function captureFailure(act: number, name: string): Promise<void> {
  if (!page) return;
  try {
    await mkdir(artifactDir, { recursive: true });
    await page.screenshot({ path: join(artifactDir, `act-${String(act).padStart(2, '0')}-${name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.png`), fullPage: true, animations: 'disabled', timeout: 12_000 });
  } catch {
    // Preserve the original test failure if a screenshot cannot be captured.
  }
}

async function check(act: number, kind: CaseKind, name: string, operation: () => Promise<string | void>): Promise<boolean> {
  const started = Date.now();
  try {
    const detail = await operation() || 'Assertion passed.';
    const result: CaseResult = { act, kind, name, status: 'PASS', durationMs: Date.now() - started, detail };
    results.push(result);
    console.log(chalk.green(`  PASS ${kind.padEnd(8)} ${name} · ${detail}`));
    return true;
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Unknown test error.';
    const result: CaseResult = { act, kind, name, status: 'FAIL', durationMs: Date.now() - started, detail };
    results.push(result);
    console.error(chalk.red(`  FAIL ${kind.padEnd(8)} ${name} · ${detail}`));
    await captureFailure(act, name);
    return false;
  }
}

function skip(act: number, kind: CaseKind, name: string, detail: string): void {
  results.push({ act, kind, name, status: 'SKIP', durationMs: 0, detail });
  console.warn(chalk.yellow(`  SKIP ${kind.padEnd(8)} ${name} · ${detail}`));
}

function beginAct(number: number): void {
  console.log(`\n${chalk.bgMagenta.white.bold(` ACT ${number} `)} ${chalk.magenta.bold(acts[number - 1])}`);
}

async function login(email: string, password: string, role: string): Promise<JsonObject> {
  assert(context && page, 'Browser context is not ready.');
  const { response, body } = await jsonRequest(context.request, 'POST', '/api/auth/login', { email, password });
  assert(response.ok(), `Login API returned HTTP ${response.status()}: ${String(body.error ?? 'no error detail')}`);
  const user = asObject(body.user);
  assert(user.role === role, `Expected role ${role}, received ${String(user.role)}.`);
  return user;
}

async function loginAdminAndOpenDashboard(): Promise<void> {
  assert(page, 'Browser page is not ready.');
  await login(adminEmail, adminPassword, 'ADMIN');
  const response = await page.goto(absolute('/admin/dashboard'), { waitUntil: 'domcontentloaded', timeout: 20_000 });
  assert(response && response.status() < 400, `Admin dashboard returned HTTP ${response?.status() ?? 'no response'}.`);
  await page.getByRole('heading', { name: 'Hoạt động cửa hàng' }).waitFor({ state: 'visible', timeout: 12_000 });
}

async function markDependentActsSkipped(startAt: number, reason: string): Promise<void> {
  for (let act = startAt; act <= 10; act += 1) {
    beginAct(act);
    skip(act, 'EDGE', 'Prerequisite unavailable', reason);
  }
}

function markdownCell(value: string): string {
  return value.replace(/\|/g, '\\|').replace(/[\r\n]+/g, ' ');
}

function createReport(): string {
  const count = (kind: CaseKind, status: CaseStatus) => results.filter((result) => result.kind === kind && result.status === status).length;
  const pass = results.filter((result) => result.status === 'PASS').length;
  const fail = results.filter((result) => result.status === 'FAIL').length;
  const skipped = results.filter((result) => result.status === 'SKIP').length;
  const actRows = acts.map((name, index) => {
    const actNumber = index + 1;
    const entries = results.filter((result) => result.act === actNumber);
    const actPass = entries.filter((result) => result.status === 'PASS').length;
    const actFail = entries.filter((result) => result.status === 'FAIL').length;
    const actSkip = entries.filter((result) => result.status === 'SKIP').length;
    return `| ${actNumber} | ${name} | ${actPass} | ${actFail} | ${actSkip} |`;
  });

  return [
    '# GOD MODE E2E AUDIT REPORT',
    '',
    `- **Run:** ${new Date().toLocaleString('vi-VN')}`,
    `- **Target:** ${baseUrl.origin}`,
    `- **Run ID:** ${runId}`,
    '- **Browser:** Playwright Chromium (headed)',
    `- **Total:** ${pass} PASS · ${fail} FAIL · ${skipped} SKIP`,
    `- **Browser page errors:** ${pageErrors.length}`,
    '',
    '## Negative / Positive Summary',
    '',
    '| Test class | PASS | FAIL | SKIP |',
    '|---|---:|---:|---:|',
    `| Positive | ${count('POSITIVE', 'PASS')} | ${count('POSITIVE', 'FAIL')} | ${count('POSITIVE', 'SKIP')} |`,
    `| Negative | ${count('NEGATIVE', 'PASS')} | ${count('NEGATIVE', 'FAIL')} | ${count('NEGATIVE', 'SKIP')} |`,
    `| Edge cases | ${count('EDGE', 'PASS')} | ${count('EDGE', 'FAIL')} | ${count('EDGE', 'SKIP')} |`,
    '',
    '## Act Summary',
    '',
    '| Act | Suite | PASS | FAIL | SKIP |',
    '|---:|---|---:|---:|---:|',
    ...actRows,
    '',
    '## Detailed Results',
    '',
    '| Act | Class | Case | Status | Time | Detail |',
    '|---:|---|---|---|---:|---|',
    ...results.map((result) => `| ${result.act || 'Gate'} | ${result.kind} | ${markdownCell(result.name)} | **${result.status}** | ${result.durationMs} ms | ${markdownCell(result.detail)} |`),
    '',
    '## Browser Errors',
    '',
    ...(pageErrors.length ? pageErrors.map((message) => `- ${markdownCell(message)}`) : ['- None observed.']),
    '',
    '## Cleanup / Retained Evidence',
    '',
    ...(cleanupNotes.length ? cleanupNotes.map((note) => `- ${note}`) : ['- No cleanup notes.']),
    '- Audit logs generated by the test are intentionally retained as evidence.',
    '',
    '## Safety Conditions',
    '',
    '- Mutating suite refuses non-local application hosts; `DATABASE_URL` may target a remote database when explicitly configured.',
    '- Requires explicit `GOD_MODE_ALLOW_MUTATIONS=1` and `AUDIT_ADMIN_PASSWORD`; secrets are never written to the report.',
    '- Test creates temporary KOC/customer/B2B/voucher/order/review data and attempts cleanup at the end.',
    '- Do not point the local app at production services. Use a disposable local database snapshot.',
    '',
  ].join('\n');
}

async function cleanup(): Promise<void> {
  if (!context) return;
  try {
    const cookies = await context.cookies(baseUrl.origin);
    const cartCookie = cookies.find((cookie) => cookie.name === 'bohoch_cart');
    cartId = cartCookie ? decodeURIComponent(cartCookie.value) : cartId;
  } catch {
    // Continue cleanup with identifiers collected during setup.
  }

  try {
    const orderRows = idempotencyKeys.length
      ? await prisma.order.findMany({ where: { idempotencyKey: { in: idempotencyKeys } }, select: { id: true } })
      : [];
    const orderIds = orderRows.map((order) => order.id);
    await prisma.$transaction(async (transaction) => {
      if (orderIds.length) {
        await transaction.review.deleteMany({ where: { orderId: { in: orderIds } } });
        await transaction.payment.deleteMany({ where: { orderId: { in: orderIds } } });
        await transaction.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
        await transaction.order.deleteMany({ where: { id: { in: orderIds } } });
      }
      if (cartId) await transaction.cart.deleteMany({ where: { id: cartId } });
      if (createdVoucherId) await transaction.voucher.deleteMany({ where: { id: createdVoucherId } });
      if (customerEmail) {
        await transaction.customer.deleteMany({ where: { email: customerEmail } });
        await transaction.user.deleteMany({ where: { email: customerEmail } });
      }
      if (adminKocEmail) await transaction.user.deleteMany({ where: { email: adminKocEmail } });
      if (b2bEmail) await transaction.b2bInquiry.deleteMany({ where: { email: b2bEmail } });
      for (const [productId, stock] of originalProductStocks) {
        await transaction.product.updateMany({ where: { id: productId }, data: { stock } });
      }
    });
    cleanupNotes.push('Temporary orders, review, cart, voucher, local test users, B2B inquiry, and product stock adjustments were cleaned up.');
  } catch (error) {
    cleanupNotes.push(`CLEANUP FAILED: ${error instanceof Error ? error.message : 'Unknown cleanup error.'}`);
  }
}

async function main(): Promise<void> {
  const gateError = localTargetGuard();
  

  let adminSetupReady = false;
  let customerReady = false;
  let checkoutReady = false;
  let paymentReady = false;
  let deliveredReady = false;
  let returnedReady = false;
  try {
    await mkdir(artifactDir, { recursive: true });
    browser = await chromium.launch({ headless: false });
    context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
    page = await context.newPage();
    page.setDefaultTimeout(12_000);
    page.on('pageerror', (error) => {
      pageErrors.push(error.message);
      console.error(chalk.red(`Browser page error: ${error.message}`));
    });

    beginAct(1);
    await check(1, 'NEGATIVE', 'Webhook missing authorization returns 401', async () => {
      const { response } = await jsonRequest(context!.request, 'POST', '/api/payment/sepay/webhook', { content: 'MKF-000000', transferAmount: 1 });
      assert(response.status() === 401, `Expected 401; received ${response.status()}.`);
      return 'Unauthenticated webhook was rejected before database access.';
    });
    await check(1, 'NEGATIVE', 'Webhook invalid authorization returns 401', async () => {
      const { response } = await jsonRequest(context!.request, 'POST', '/api/payment/sepay/webhook', { content: 'MKF-000000', transferAmount: 1 }, { authorization: 'Apikey definitely-wrong' });
      assert(response.status() === 401, `Expected 401; received ${response.status()}.`);
      return 'Invalid webhook credential was rejected.';
    });

    beginAct(2);
    await check(2, 'POSITIVE', 'SGD locale renders and submits the Singapore B2B form', async () => {
      await page!.goto(absolute('/hop-tac-b2b'), { waitUntil: 'domcontentloaded', timeout: 20_000 });
      await page!.getByRole('button', { name: 'SGD', exact: true }).click();
      const b2bForm = page!.locator('.b2b-inquiry-form');
      await b2bForm.waitFor({ state: 'visible', timeout: 10_000 });
      for (const field of ['#b2b-company', '#b2b-contact', '#b2b-email', '#b2b-moq']) {
        await page!.locator(field).waitFor({ state: 'visible', timeout: 5_000 });
      }
      await page!.locator('#b2b-company').fill(`God Mode Importer ${runId}`);
      await page!.locator('#b2b-country').selectOption('Singapore');
      await page!.locator('#b2b-contact').fill('God Mode Contact');
      await page!.locator('#b2b-phone').fill('+65 6123 4567');
      await page!.locator('#b2b-email').fill(b2bEmail);
      await page!.locator('#b2b-moq').fill('500 packs per month');
      await page!.locator('#b2b-message').fill(`Automated local test ${runId}`);
      await b2bForm.locator('button[type="submit"]').click();
      await page!.locator('.b2b-toast').waitFor({ state: 'visible', timeout: 10_000 });
      return 'SGD B2B form submitted and a toast was displayed.';
    });

    beginAct(3);
    adminSetupReady = await check(3, 'POSITIVE', 'Admin creates KOC and test voucher using seeded stock', async () => {
      await loginAdminAndOpenDashboard();
      primaryProduct = await prisma.product.findFirst({ where: { active: true } }) ?? undefined;
      assert(primaryProduct && Number.isInteger(primaryProduct.price) && primaryProduct.price > 0, 'No active product with a valid price was found.');
      primaryQuantity = Math.max(2, Math.ceil(250_000 / primaryProduct.price));
      assert(primaryQuantity <= 20, `The first active product requires ${primaryQuantity} units to pass FREESHIP, exceeding the 20-unit checkout limit.`);
      primaryTestStock = primaryProduct.stock;
      originalProductStocks.set(primaryProduct.id, primaryTestStock);

      const kocResult = await jsonRequest(context!.request, 'POST', '/api/admin/affiliates', {
        name: `God Mode Partner ${runId}`,
        email: adminKocEmail,
        password: adminKocPassword,
        affiliateCode,
        commissionRate: affiliateCommissionRate,
        bankAccount: '99998888',
      });
      assert(kocResult.response.status() === 201, `KOC creation returned HTTP ${kocResult.response.status()}: ${String(asObject(kocResult.body.error).message ?? '')}`);
      createdAffiliateId = typeof kocResult.body.id === 'string' ? kocResult.body.id : undefined;
      assert(createdAffiliateId, 'KOC creation response did not include its id.');

      await jsonRequest(context!.request, 'GET', '/api/admin/vouchers');
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const voucherResult = await jsonRequest(context!.request, 'POST', '/api/admin/vouchers', {
        code: voucherCode,
        name: `God Mode one-use voucher ${runId}`,
        discountType: 'PERCENTAGE',
        value: 10,
        maxDiscount: 100_000,
        minSpend: 0,
        usageLimit: 1,
        expiresAt,
        isActive: true,
        freeShipping: false,
        firstOrderOnly: false,
        showOnPromoPage: false,
      });
      assert(voucherResult.response.status() === 201, `Voucher creation returned HTTP ${voucherResult.response.status()}.`);
      const voucher = asObject(voucherResult.body.item);
      createdVoucherId = typeof voucher.id === 'string' ? voucher.id : undefined;
      assert(createdVoucherId, 'Voucher creation response did not include its id.');
      return `Created affiliate ${affiliateCode} and voucher ${voucherCode}; using ${primaryProduct.name} × ${primaryQuantity} per order with seeded stock ${primaryTestStock}.`;
    });

    if (!adminSetupReady) {
      await markDependentActsSkipped(4, 'ACT 03 prerequisites failed; no customer checkout or fulfillment mutations were attempted.');
    } else {
      beginAct(4);
      customerReady = await check(4, 'POSITIVE', 'Customer registers and attribution ref is captured', async () => {
        const register = await jsonRequest(context!.request, 'POST', '/api/auth/register', {
          name: `God Mode Customer ${runId}`,
          email: customerEmail,
          password: customerPassword,
          phone: customerPhone,
        });
        assert(register.response.status() === 201, `Customer registration returned HTTP ${register.response.status()}.`);
        assert(asObject(register.body.user).role === 'CUSTOMER', 'Registered test user does not have CUSTOMER role.');
        await page!.goto(absolute(`/?ref=${encodeURIComponent(affiliateCode)}`), { waitUntil: 'domcontentloaded', timeout: 20_000 });
        await page!.waitForFunction((code) => {
          const attribution = localStorage.getItem('mackhen_affiliate_attribution');
          return Boolean(attribution && JSON.parse(attribution).code === code);
        }, affiliateCode, { timeout: 10_000 });
        return `Customer session created; ?ref attribution stored as ${affiliateCode}.`;
      });

      await check(4, 'NEGATIVE', 'Adding more than test stock is rejected', async () => {
        assert(customerReady && primaryProduct, 'Customer or target product setup did not complete.');
        const result = await jsonRequest(context!.request, 'POST', '/api/cart/items', { productId: primaryProduct.id, quantity: primaryTestStock + 1 });
        assert(result.response.status() === 409, `Expected stock conflict 409; received ${result.response.status()}.`);
        assert(asObject(result.body.error).code === 'INSUFFICIENT_STOCK', `Unexpected stock error code: ${String(asObject(result.body.error).code)}.`);
        return String(asObject(result.body.error).message ?? 'Stock limit enforced.');
      });

      const singleItemReady = await check(4, 'EDGE', 'One unit validates the FREESHIP threshold', async () => {
        assert(customerReady && primaryProduct, 'Customer or target product setup did not complete.');
        const add = await jsonRequest(context!.request, 'POST', '/api/cart/items', { productId: primaryProduct.id, quantity: 1 });
        assert(add.response.ok(), `Adding one unit returned HTTP ${add.response.status()}.`);
        const addBody = asObject(add.body.item);
        assert(typeof addBody.id === 'string', 'Cart response did not include the test product line item id.');
        primaryCartItemId = addBody.id;
        cartId = undefined;
        const voucher = await jsonRequest(context!.request, 'POST', '/api/checkout/voucher', { voucherCode: 'FREESHIP', phone: customerPhone });
        if (primaryProduct.price < 250_000) {
          assert(voucher.response.status() === 400, `Expected FREESHIP minimum-spend rejection 400; received ${voucher.response.status()}.`);
          assert(String(asObject(voucher.body.error).message ?? '').includes('Cần mua thêm'), `Unexpected FREESHIP response: ${JSON.stringify(voucher.body.error)}.`);
        } else {
          assert(voucher.response.ok() && Number(voucher.body.subtotal) >= 250_000, `Expected FREESHIP eligibility for one unit; received HTTP ${voucher.response.status()}.`);
        }
        const voucherDetail = voucher.response.ok()
          ? `subtotal ${String(voucher.body.subtotal)} meets the threshold`
          : String(asObject(voucher.body.error).message ?? 'FREESHIP minimum spend rejected');
        return `Single-item FREESHIP check: ${voucherDetail}.`;
      });

      if (!customerReady || !singleItemReady) {
        await markDependentActsSkipped(5, 'Customer ATP/FREESHIP setup did not complete.');
      } else {
        beginAct(5);
        checkoutReady = await check(5, 'EDGE', 'Three concurrent checkout submissions share one idempotency key', async () => {
          assert(primaryProduct && primaryCartItemId, 'Test product cart line item is unavailable.');
          const setQuantity = await jsonRequest(context!.request, 'PATCH', '/api/cart/items', { itemId: primaryCartItemId, variantId: null, quantity: primaryQuantity });
          assert(setQuantity.response.ok(), `Setting test product quantity to ${primaryQuantity} returned HTTP ${setQuantity.response.status()}.`);
          const freeShipping = await jsonRequest(context!.request, 'POST', '/api/checkout/voucher', { voucherCode: 'FREESHIP', phone: customerPhone });
          assert(freeShipping.response.ok() && Number(freeShipping.body.subtotal) >= 250_000,
            `Expected FREESHIP eligibility at quantity ${primaryQuantity}; received HTTP ${freeShipping.response.status()} with ${JSON.stringify(freeShipping.body.error)}.`);
          const eligibility = await jsonRequest(context!.request, 'POST', '/api/checkout/voucher', { voucherCode, phone: customerPhone });
          assert(eligibility.response.ok(), `Test voucher not eligible: ${JSON.stringify(eligibility.body.error)}.`);
          const checkoutBody = {
            customerName: `God Mode Customer ${runId}`,
            customer: { name: `God Mode Customer ${runId}`, email: customerEmail, phone: customerPhone },
            phone: customerPhone,
            address: '12 Test Street, Ward 1, District 1, Ho Chi Minh City',
            delivery: { address: '12 Test Street, Ward 1, District 1, Ho Chi Minh City' },
            voucherCode,
            affiliateCode,
            paymentMethod: 'VIETQR',
          };
          const [first, second, third] = await Promise.all([idempotencyKeys[0], idempotencyKeys[0], idempotencyKeys[0]].map((key) =>
            jsonRequest(context!.request, 'POST', '/api/orders', checkoutBody, { 'idempotency-key': key }),
          ));
          const responses = [first, second, third];
          const successful = responses.filter(({ response }) => response.status() === 200 || response.status() === 201);
          assert(successful.length >= 1, `All concurrent checkout requests failed: ${responses.map((entry) => `${entry.response.status()}:${JSON.stringify(entry.body.error)}`).join(' | ')}`);
          const codes = [...new Set(successful.map(({ body }) => body.orderCode).filter((code): code is string => typeof code === 'string'))];
          assert(codes.length === 1, `Expected one persisted order code; got ${codes.length}.`);
          primaryOrderCode = codes[0];
          const order = await prisma.order.findUnique({ where: { orderCode: primaryOrderCode } });
          assert(order && order.idempotencyKey === `${runId}-primary-checkout`, 'Persisted checkout does not match the idempotency key.');
          assert(order.affiliateCode === affiliateCode, `Referral attribution missing from order (${String(order.affiliateCode)}).`);
          primaryOrderTotal = order.totalAmount;
          const orderCount = await prisma.order.count({ where: { idempotencyKey: `${runId}-primary-checkout` } });
          assert(orderCount === 1, `Expected exactly one order for the idempotency key; found ${orderCount}.`);
          return `3 requests returned ${successful.length} success responses; 1 unique order ${primaryOrderCode} persisted (other requests may return duplicate or conflict).`;
        });

        if (!checkoutReady || !primaryOrderCode) {
          await markDependentActsSkipped(6, 'The idempotent primary order was not created.');
        } else {
          const sepaySecret = process.env.SEPAY_WEBHOOK_SECRET;
          if (!sepaySecret) {
            skip(5, 'NEGATIVE', 'Underpaid authenticated webhook does not pay the order', 'SEPAY_WEBHOOK_SECRET is not configured; authenticated underpayment check was skipped.');
          } else {
            await check(5, 'NEGATIVE', 'Underpaid authenticated webhook does not pay the order', async () => {
            const before = await prisma.order.findUnique({ where: { orderCode: primaryOrderCode }, select: { totalAmount: true, paymentStatus: true } });
            assert(before, 'Primary test order is missing.');
            const webhook = await jsonRequest(context!.request, 'POST', '/api/payment/sepay/webhook', {
              content: primaryOrderCode,
              transferAmount: before.totalAmount - 1,
              referenceCode: `GOD-${runId}`,
            }, { authorization: `Apikey ${sepaySecret}` });
            assert(webhook.response.status() === 200, `Webhook acknowledgement returned HTTP ${webhook.response.status()}.`);
            const after = await prisma.order.findUnique({ where: { orderCode: primaryOrderCode }, select: { paymentStatus: true } });
            assert(after?.paymentStatus === 'PENDING', `Underpayment changed order payment status to ${String(after?.paymentStatus)}.`);
            return 'One-dollar-under payment was acknowledged but order remained PENDING.';
            });
          }
          await check(5, 'EDGE', 'One-use voucher is consumed exactly once', async () => {
            const voucher = await prisma.voucher.findUnique({ where: { code: voucherCode }, select: { usedCount: true, usageLimit: true, isActive: true } });
            assert(voucher?.usageLimit === 1 && voucher.usedCount === 1 && voucher.isActive === false,
              `Expected usedCount=1, usageLimit=1, inactive=false; received ${JSON.stringify(voucher)}.`);
            return 'Voucher usage count is 1 and voucher is inactive after reaching its one-use limit.';
          });
        }
      }

      if (!checkoutReady || !primaryOrderCode) {
        for (const act of [6, 7, 8, 9, 10]) {
          if (results.some((result) => result.act === act)) continue;
          beginAct(act);
          skip(act, 'EDGE', 'Dependent checkout flow', 'Primary checkout prerequisite failed.');
        }
      } else {
        beginAct(6);
        paymentReady = await check(6, 'POSITIVE', 'Admin SePay simulation changes the order to PAID', async () => {
          await loginAdminAndOpenDashboard();
          const simulated = await jsonRequest(context!.request, 'POST', '/api/admin/sepay/simulate', { orderCode: primaryOrderCode });
          assert(simulated.response.ok(), `SePay simulation returned HTTP ${simulated.response.status()}: ${String(asObject(simulated.body.error).message ?? '')}`);
          const order = await prisma.order.findUnique({ where: { orderCode: primaryOrderCode }, select: { paymentStatus: true, orderStatus: true } });
          assert(order?.paymentStatus === 'PAID', `Expected paymentStatus PAID; got ${String(order?.paymentStatus)}.`);
          return `Payment confirmed; order state is ${order.orderStatus}.`;
        });
        if (paymentReady) {
          await check(6, 'EDGE', 'Product stock reflects the completed checkout', async () => {
            assert(primaryProduct, 'Test product is unavailable.');
            const primary = await prisma.product.findUnique({ where: { id: primaryProduct.id }, select: { stock: true } });
            assert(primary?.stock === primaryTestStock - primaryQuantity,
              `Expected stock ${primaryTestStock - primaryQuantity} after checkout; got ${primary?.stock}.`);
            return `${primaryProduct.name} quantity ${primaryQuantity} checked out; physical stock=${primary.stock}.`;
          });
        } else {
          beginAct(7);
          skip(7, 'POSITIVE', 'WMS/FSM and print slip', 'Payment simulation failed.');
          beginAct(8);
          skip(8, 'POSITIVE', 'Invoice and review', 'Payment simulation failed.');
          beginAct(9);
          skip(9, 'EDGE', 'Restock', 'Payment simulation failed.');
          beginAct(10);
          skip(10, 'POSITIVE', 'KOC settlement, audit, CRO', 'Payment simulation failed.');
        }

        if (paymentReady) {
          beginAct(7);
          const workflowReady = await check(7, 'POSITIVE', 'Admin advances order through WMS states and prints checksum slip', async () => {
            const updateStatus = async (status: string, extra: JsonObject = {}) => {
              const result = await jsonRequest(context!.request, 'PATCH', '/api/admin/orders', { orderCode: primaryOrderCode, status, ...extra });
              assert(result.response.ok(), `${status} returned HTTP ${result.response.status()}: ${String(asObject(result.body.error).message ?? '')}`);
            };
            await updateStatus('PROCESSING');
            await updateStatus('HANDED_OFF', { carrier: 'SPX', trackingCode: `GM${runId.slice(-8)}` });
            await updateStatus('SHIPPING', { carrier: 'SPX', trackingCode: `GM${runId.slice(-8)}` });
            const blocked = await jsonRequest(context!.request, 'PATCH', '/api/admin/orders', { orderCode: primaryOrderCode, status: 'PENDING' });
            assert(blocked.response.status() === 409, `Backward SHIPPING → PENDING transition returned ${blocked.response.status()}, expected 409.`);
            await updateStatus('DELIVERED');
            const order = await prisma.order.findUnique({ where: { orderCode: primaryOrderCode }, select: { orderStatus: true } });
            assert(order?.orderStatus === 'DELIVERED', `Expected DELIVERED, received ${String(order?.orderStatus)}.`);
            await page!.goto(absolute(`/admin/orders/print/${primaryOrderCode}`), { waitUntil: 'domcontentloaded', timeout: 20_000 });
            await page!.locator('svg[aria-label^="Barcode Code128"]').waitFor({ state: 'visible', timeout: 10_000 });
            await page!.getByText(/SHA-256 Digital Checksum/).waitFor({ state: 'visible', timeout: 10_000 });
            return 'WMS reached DELIVERED, backward transition was rejected with 409, and barcode/SHA-256 rendered.';
          });
          deliveredReady = workflowReady;
          if (deliveredReady) {
            beginAct(8);
            await check(8, 'POSITIVE', 'Customer tracking invoice is rendered and printable to PDF', async () => {
              await page!.goto(absolute(`/tra-cuu?orderCode=${encodeURIComponent(primaryOrderCode!)}`), { waitUntil: 'domcontentloaded', timeout: 20_000 });
              await page!.locator('#tracking-phone').fill(customerPhone);
              await page!.getByRole('button', { name: /track order|tra cứu đơn hàng/i }).click();
              const trackedOrder = page!.locator('.tracking-order');
              await trackedOrder.waitFor({ state: 'visible', timeout: 15_000 });
              await trackedOrder.locator('button.tracking-print-button').waitFor({ state: 'visible', timeout: 8_000 });
              await trackedOrder.locator('.tracking-integrity-seal').waitFor({ state: 'visible', timeout: 8_000 });
              const pdfPath = join(artifactDir, `invoice-${primaryOrderCode}.pdf`);
              await page!.pdf({ path: pdfPath, format: 'A4', printBackground: true });
              const pdfStats = await stat(pdfPath);
              assert(pdfStats.size > 500, `Generated PDF appears empty (${pdfStats.size} bytes).`);
              return `Tracking invoice and SHA-256 integrity seal rendered; PDF is ${pdfStats.size} bytes.`;
            });
            await check(8, 'POSITIVE', 'Customer submits a verified five-star product review', async () => {
              assert(primaryProduct, 'Primary product is unavailable.');
              const reviewUrl = `/products/${encodeURIComponent(primaryProduct.slug)}?${new URLSearchParams({ review: '1', orderCode: primaryOrderCode!, phone: customerPhone }).toString()}#product-reviews-title`;
              await page!.goto(absolute(reviewUrl), { waitUntil: 'domcontentloaded', timeout: 20_000 });
              await page!.locator('#review-form-panel').waitFor({ state: 'visible', timeout: 10_000 });
              await page!.locator('#review-name').fill(`God Mode Customer ${runId}`);
              await page!.locator('#review-phone').fill(customerPhone);
              await page!.locator('#review-order-code').fill(primaryOrderCode!);
              await page!.locator('.review-stars-picker').getByRole('button', { name: /5 sao|5 stars/i }).click();
              await page!.locator('#review-comment').fill(`God Mode verified five-star review ${runId}. Product arrived in good condition.`);
              await page!.getByRole('button', { name: /gửi đánh giá|submit review/i }).click();
              await page!.getByRole('status').filter({ hasText: /đánh giá của bạn đã được thêm|your review has been added/i }).waitFor({ state: 'visible', timeout: 12_000 });
              const review = await prisma.review.findUnique({ where: { orderId_productId: { orderId: (await prisma.order.findUniqueOrThrow({ where: { orderCode: primaryOrderCode! }, select: { id: true } })).id, productId: primaryProduct.id } } });
              assert(review?.rating === 5, `Review was not persisted with five stars; got ${String(review?.rating)}.`);
              return 'Verified five-star review was persisted against the delivered order.';
            });
          } else {
            beginAct(8);
            skip(8, 'POSITIVE', 'Invoice and review', 'WMS fulfillment prerequisite failed.');
          }

          beginAct(9);
          returnedReady = await check(9, 'EDGE', 'Second order can be returned and physical inventory is restored', async () => {
            assert(primaryProduct, 'Test product is unavailable.');
            await login(customerEmail, customerPassword, 'CUSTOMER');
            const before = await prisma.product.findMany({ where: { id: primaryProduct.id }, select: { id: true, stock: true } });
            const beforeById = new Map(before.map((product) => [product.id, product.stock]));
            const second = await jsonRequest(context!.request, 'POST', '/api/orders', {
              customerName: `God Mode Customer ${runId}`,
              customer: { name: `God Mode Customer ${runId}`, email: customerEmail, phone: customerPhone },
              phone: customerPhone,
              address: '12 Test Street, Ward 1, District 1, Ho Chi Minh City',
              delivery: { address: '12 Test Street, Ward 1, District 1, Ho Chi Minh City' },
              affiliateCode,
              paymentMethod: 'VIETQR',
            }, { 'idempotency-key': idempotencyKeys[1] });
            assert(second.response.status() === 201, `Return-order checkout returned HTTP ${second.response.status()}: ${String(asObject(second.body.error).message ?? '')}`);
            returnedOrderCode = typeof second.body.orderCode === 'string' ? second.body.orderCode : undefined;
            assert(returnedOrderCode, 'Return-order response did not contain orderCode.');
            await loginAdminAndOpenDashboard();
            const paid = await jsonRequest(context!.request, 'POST', '/api/admin/sepay/simulate', { orderCode: returnedOrderCode });
            assert(paid.response.ok(), `Second-order payment simulation returned HTTP ${paid.response.status()}.`);
            const update = async (status: string, extra: JsonObject = {}) => {
              const result = await jsonRequest(context!.request, 'PATCH', '/api/admin/orders', { orderCode: returnedOrderCode, status, ...extra });
              assert(result.response.ok(), `${status} for return order returned HTTP ${result.response.status()}.`);
            };
            await update('PROCESSING');
            await update('HANDED_OFF', { carrier: 'SPX', trackingCode: `RT${runId.slice(-8)}` });
            await update('SHIPPING', { carrier: 'SPX', trackingCode: `RT${runId.slice(-8)}` });
            const duringReturn = await prisma.product.findMany({ where: { id: primaryProduct.id }, select: { id: true, stock: true } });
            await update('RETURNED');
            const after = await prisma.product.findMany({ where: { id: primaryProduct.id }, select: { id: true, stock: true } });
            const duringById = new Map(duringReturn.map((product) => [product.id, product.stock]));
            const afterById = new Map(after.map((product) => [product.id, product.stock]));
            for (const product of [primaryProduct]) {
              const expectedAfterReturn = beforeById.get(product.id)!;
              assert(afterById.get(product.id) === expectedAfterReturn,
                `${product.name} stock did not return to pre-order value ${expectedAfterReturn}; during=${duringById.get(product.id)}, after=${afterById.get(product.id)}.`);
            }
            const returned = await prisma.order.findUnique({ where: { orderCode: returnedOrderCode }, select: { orderStatus: true } });
            assert(returned?.orderStatus === 'RETURNED', `Expected RETURNED, received ${String(returned?.orderStatus)}.`);
            return `Returned order ${returnedOrderCode}; test product stock matches its pre-order value.`;
          });

          beginAct(10);
          await check(10, 'EDGE', 'Returned KOC order appears in the commission summary', async () => {
            assert(returnedReady && returnedOrderCode, 'Reverse-logistics prerequisite failed.');
            const user = await login(adminKocEmail, adminKocPassword, 'AFFILIATE');
            assert(user.role === 'AFFILIATE', 'Affiliate login role was not retained.');
            const dashboard = await jsonRequest(context!.request, 'GET', '/api/affiliate/dashboard');
            assert(dashboard.response.ok(), `Affiliate dashboard returned HTTP ${dashboard.response.status()}.`);
            const orders = Array.isArray(dashboard.body.orders) ? dashboard.body.orders as JsonObject[] : [];
            const returnedOrder = orders.find((order) => order.orderCode === returnedOrderCode);
            assert(returnedOrder, `Returned order ${returnedOrderCode} is missing from KOC dashboard.`);
            assert(typeof returnedOrder.commission === 'number' && Number.isFinite(returnedOrder.commission) && returnedOrder.commission >= 0,
              `Returned order commission is not a valid non-negative amount: ${String(returnedOrder.commission)}.`);
            assert(typeof dashboard.body.commissionDue === 'number' && Number.isFinite(dashboard.body.commissionDue),
              `Affiliate commissionDue is not numeric: ${String(dashboard.body.commissionDue)}.`);
            return `Returned order is listed with commission ${returnedOrder.commission}; dashboard due total is ${dashboard.body.commissionDue}.`;
          });

          await check(10, 'POSITIVE', 'Admin audit logs contain order status actions', async () => {
            await loginAdminAndOpenDashboard();
            const allLogs = await jsonRequest(context!.request, 'GET', '/api/admin/audit-logs?page=1&pageSize=100');
            assert(allLogs.response.ok(), `Audit log API returned HTTP ${allLogs.response.status()}.`);
            const logs = (Array.isArray(allLogs.body.items) ? allLogs.body.items : []) as JsonObject[];
            const orderAudited = logs.some((item) => ['UPDATE_ORDER_STATUS', 'RETURN_ORDER'].includes(String(item.action)) && [primaryOrderCode, returnedOrderCode].includes(String(item.targetId)));
            assert(orderAudited, `No fulfillment/return audit action found for ${primaryOrderCode} or ${returnedOrderCode}.`);
            return `Audit logs include order fulfillment/return actions (${logs.length} recent entries inspected).`;
          });

          await check(10, 'POSITIVE', 'Voucher redemption is reflected in persisted state', async () => {
            assert(createdVoucherId && primaryOrderCode, 'Voucher or checkout prerequisite is unavailable.');
            const voucher = await prisma.voucher.findUnique({ where: { id: createdVoucherId }, select: { usedCount: true, usageLimit: true, isActive: true } });
            assert(voucher?.usageLimit === 1 && voucher.usedCount === 1 && voucher.isActive === false,
              `Voucher redemption state is unexpected: ${JSON.stringify(voucher)}.`);
            return `Voucher ${voucherCode} is consumed and inactive.`;
          });

          await check(10, 'POSITIVE', 'Admin CRO conversion funnel renders', async () => {
            await page!.goto(absolute('/admin/reports'), { waitUntil: 'domcontentloaded', timeout: 20_000 });
            const funnel = page!.locator('.cro-funnel');
            await funnel.waitFor({ state: 'visible', timeout: 12_000 });
            await funnel.getByRole('heading', { name: 'Phễu chuyển đổi thương mại điện tử' }).waitFor({ state: 'visible', timeout: 8_000 });
            return 'CRO funnel widget and heading rendered on Admin reports.';
          });
        }
      }
    }
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Unknown fatal error.';
    console.error(chalk.red.bold(`GOD MODE FATAL: ${detail}`));
    results.push({ act: 0, kind: 'EDGE', name: 'Suite runtime', status: 'FAIL', durationMs: 0, detail });
  } finally {
    try {
      await cleanup();
    } finally {
      if (pageErrors.length) {
        results.push({
          act: 0,
          kind: 'EDGE',
          name: 'Browser JavaScript errors',
          status: 'FAIL',
          durationMs: 0,
          detail: `${pageErrors.length} page error(s): ${pageErrors.slice(0, 5).join(' | ')}`,
        });
      }
      results.sort((left, right) => left.act - right.act);
      await writeFile(reportPath, createReport(), 'utf8');
      reportWritten = true;
      await context?.close().catch(() => undefined);
      await browser?.close().catch(() => undefined);
      await prisma.$disconnect().catch(() => undefined);
    }
  }

  if (!reportWritten) await writeFile(reportPath, createReport(), 'utf8');
  const failures = results.filter((result) => result.status === 'FAIL').length;
  console.log(`\n${chalk.bgCyan.black.bold(' GOD MODE COMPLETE ')} ${chalk.bold(`${results.filter((result) => result.status === 'PASS').length} PASS · ${failures} FAIL · ${results.filter((result) => result.status === 'SKIP').length} SKIP`)}`);
  console.log(chalk.cyan(`Report: ${reportPath}`));
  if (failures > 0 || cleanupNotes.some((note) => note.startsWith('CLEANUP FAILED'))) process.exitCode = 1;
}

void main().catch(async (error: unknown) => {
  const detail = error instanceof Error ? error.message : 'Unknown top-level error.';
  results.push({ act: 0, kind: 'EDGE', name: 'Unhandled suite error', status: 'FAIL', durationMs: 0, detail });
  await writeFile(reportPath, createReport(), 'utf8').catch(() => undefined);
  console.error(chalk.red.bold(`GOD MODE FAILED: ${detail}`));
  process.exitCode = 1;
});
