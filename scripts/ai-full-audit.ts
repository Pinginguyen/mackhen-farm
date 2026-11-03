import 'dotenv/config';

import { chromium, type Browser, type BrowserContext, type Page, type Request } from '@playwright/test';
import { randomBytes } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { performance } from 'node:perf_hooks';

type AuditStatus = 'PASS' | 'FAIL' | 'SKIP';
type AuditResult = { step: number; suite: string; name: string; status: AuditStatus; durationMs: number; detail: string; screenshot?: string };
type Product = {
  id: string;
  slug: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  variants?: { id: string; title: string; price: number; inventory: number; stock?: number }[];
};
type ProductChoice = { product: Product; variant: NonNullable<Product['variants']>[number] | null; price: number; stock: number; quantity: number };

class AuditSkip extends Error {}

const baseUrl = new URL(process.env.BASE_URL ?? 'https://mackhen-farm.vercel.app');
const localHosts = new Set(['localhost', '127.0.0.1', '::1']);
const isLocal = localHosts.has(baseUrl.hostname);
const allowTransactions = process.env.ALLOW_AUDIT_TRANSACTIONS === '1'
  && (isLocal || process.env.ALLOW_PRODUCTION_AUDIT === '1');
const auditAdminEmail = process.env.AUDIT_ADMIN_EMAIL ?? 'admin@mackhenfarm.vn';
const auditAdminPassword = process.env.AUDIT_ADMIN_PASSWORD ?? '';
const auditCustomerEmail = process.env.AUDIT_CUSTOMER_EMAIL ?? '';
const auditCustomerPassword = process.env.AUDIT_CUSTOMER_PASSWORD ?? '';
const reportPath = join(process.cwd(), 'AI_FULL_AUDIT_REPORT.md');
const artifactsDirectory = join(process.cwd(), 'tests', 'artifacts');
const results: AuditResult[] = [];
const apiLatencies: number[] = [];
const pageErrors: string[] = [];
const requestStartedAt = new WeakMap<Request, number>();
let browser: Browser | undefined;
let context: BrowserContext | undefined;
let page: Page | undefined;
let productChoice: ProductChoice | undefined;
let productDetailPath: string | undefined;
let createdOrderCode: string | undefined;
let adminSignedIn = false;

function pathFor(path: string): string {
  return new URL(path, baseUrl).toString();
}

function assert(condition: unknown, detail: string): asserts condition {
  if (!condition) throw new Error(detail);
}

function isApiUrl(value: string): boolean {
  try {
    return new URL(value).origin === baseUrl.origin && new URL(value).pathname.startsWith('/api/');
  } catch {
    return false;
  }
}

async function screenshotFor(step: number, status: AuditStatus): Promise<string | undefined> {
  if (!page) return undefined;
  const filename = `${String(step).padStart(2, '0')}-${status.toLowerCase()}.png`;
  const filepath = join(artifactsDirectory, filename);
  try {
    await mkdir(artifactsDirectory, { recursive: true });
    await page.screenshot({ path: filepath, fullPage: true, animations: 'disabled', timeout: 20_000 });
    return `tests/artifacts/${filename}`;
  } catch (error) {
    console.warn(`Screenshot failed for step ${step}:`, error instanceof Error ? error.message : error);
    return undefined;
  }
}

async function runStep(step: number, suite: string, name: string, action: () => Promise<void>): Promise<void> {
  const startedAt = performance.now();
  try {
    await action();
    const durationMs = Math.round(performance.now() - startedAt);
    const screenshot = await screenshotFor(step, 'PASS');
    results.push({ step, suite, name, status: 'PASS', durationMs, detail: 'Hoàn tất', screenshot });
    console.log(`PASS ${String(step).padStart(2, '0')} · ${name} (${durationMs}ms)`);
  } catch (error) {
    const durationMs = Math.round(performance.now() - startedAt);
    const detail = error instanceof Error ? error.message : 'Lỗi không xác định';
    const screenshot = await screenshotFor(step, 'FAIL');
    results.push({ step, suite, name, status: 'FAIL', durationMs, detail, screenshot });
    console.error(`FAIL ${String(step).padStart(2, '0')} · ${name}: ${detail}`);
  }
}

function skipStep(step: number, suite: string, name: string, reason: string): void {
  results.push({ step, suite, name, status: 'SKIP', durationMs: 0, detail: reason });
  console.warn(`SKIP ${String(step).padStart(2, '0')} · ${name}: ${reason}`);
}

async function navigate(path: string): Promise<void> {
  assert(page, 'Browser page chưa được khởi tạo.');
  const response = await page.goto(pathFor(path), { waitUntil: 'load', timeout: 45_000 });
  assert(response && response.status() < 400, `Điều hướng ${path} trả HTTP ${response?.status() ?? 'không có response'}.`);
}

function normalizeSearch(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').toLocaleLowerCase('vi');
}

function chooseProduct(products: Product[]): ProductChoice | undefined {
  const candidates: ProductChoice[] = [];
  for (const product of products) {
    const variants = product.variants ?? [];
    const stockOptions = variants.length
      ? variants.map((variant) => ({ variant, price: variant.price, stock: variant.inventory ?? variant.stock ?? 0 }))
      : [{ variant: null, price: product.price, stock: product.stock }];
    for (const option of stockOptions) {
      const quantity = Math.max(1, Math.ceil(250_000 / option.price));
      if (quantity <= 20 && option.stock >= quantity + 1) candidates.push({ product, ...option, quantity });
    }
  }
  return candidates.sort((left, right) => right.price - left.price)[0];
}

async function firstOptionValue(selector: string): Promise<string> {
  assert(page, 'Browser page chưa được khởi tạo.');
  const select = page.locator(selector);
  await select.waitFor({ state: 'visible', timeout: 15_000 });
  await page.waitForFunction((target) => {
    const element = document.querySelector<HTMLSelectElement>(target);
    return Boolean(element && !element.disabled && element.options.length > 1);
  }, selector, { timeout: 20_000 });
  const value = await select.locator('option').nth(1).getAttribute('value');
  assert(value, `Không tìm thấy option khả dụng cho ${selector}.`);
  return value;
}

async function prepareCheckoutAddress(): Promise<void> {
  assert(page, 'Browser page chưa được khởi tạo.');
  await page.locator('#name').fill(`Audit ${new Date().toISOString().slice(0, 16)}`);
  const auditPhone = process.env.AUDIT_PHONE ?? `09${String(Math.floor(Math.random() * 10_000_000)).padStart(8, '0')}`;
  await page.locator('#phone').fill(auditPhone);
  await page.locator('#province').selectOption(await firstOptionValue('#province'));
  await page.locator('#district').selectOption(await firstOptionValue('#district'));
  await page.locator('#ward').selectOption(await firstOptionValue('#ward'));
  await page.locator('#street-address').fill('12 Duong Audit, Phuong Test');
}

async function loginWithCredentials(email: string, password: string, callbackUrl: string): Promise<void> {
  assert(page, 'Browser page chưa được khởi tạo.');
  await navigate(`/dang-nhap?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(password);
  await page.getByRole('button', { name: /đăng nhập|sign in/i }).click();
  await page.waitForURL((url) => url.pathname === callbackUrl || url.pathname.startsWith(`${callbackUrl}/`), { timeout: 20_000 });
}

function formatReport(): string {
  const pass = results.filter((result) => result.status === 'PASS').length;
  const fail = results.filter((result) => result.status === 'FAIL').length;
  const skipped = results.filter((result) => result.status === 'SKIP').length;
  const executed = pass + fail;
  const passRate = executed ? (pass / executed * 100).toFixed(1) : '0.0';
  const executionCoverage = results.length ? (executed / results.length * 100).toFixed(1) : '0.0';
  const averageApi = apiLatencies.length
    ? `${Math.round(apiLatencies.reduce((sum, latency) => sum + latency, 0) / apiLatencies.length)} ms`
    : 'N/A (không ghi nhận request API trong phiên audit)';
  const recommendations = [
    ...results.filter((result) => result.status === 'FAIL').map((result) => `- Bước ${result.step}: ${result.name} — ${result.detail}`),
    ...results.filter((result) => result.status === 'SKIP').map((result) => `- Bước ${result.step}: ${result.detail}`),
    ...(pageErrors.length ? [`- Có ${pageErrors.length} lỗi JavaScript trên trang; xem log console của tiến trình audit.`] : []),
  ];
  if (!recommendations.length) recommendations.push('- Không phát hiện khuyến nghị từ các bước đã chạy.');

  return [
    '# AI Full Audit Report',
    '',
    `- **Thời điểm:** ${new Date().toLocaleString('vi-VN')}`,
    `- **Base URL:** ${baseUrl.toString()}`,
    `- **Tổng số bước:** ${results.length}`,
    `- **Pass:** ${pass} · **Fail:** ${fail} · **Skip:** ${skipped}`,
    `- **Tỷ lệ thành công:** ${passRate}% (Pass / số bước đã chạy, không tính Skip)`,
    `- **Độ bao phủ thực thi:** ${executionCoverage}% số bước trong kế hoạch đã chạy`,
    `- **Thời gian phản hồi API trung bình:** ${averageApi}`,
    `- **Giao dịch có ghi DB được cho phép:** ${allowTransactions ? 'Có' : 'Không'}`,
    '',
    '## Kết quả theo suite',
    '',
    '| # | Suite | Kiểm tra | Kết quả | Thời gian | Chi tiết | Ảnh |',
    '|---:|---|---|---|---:|---|---|',
    ...results.map((result) => `| ${result.step} | ${result.suite} | ${result.name.replace(/\|/g, '\\|')} | ${result.status} | ${result.durationMs} ms | ${result.detail.replace(/\|/g, '\\|')} | ${result.screenshot ? `[mở](${result.screenshot})` : '—'} |`),
    '',
    '## Khuyến nghị kỹ thuật',
    '',
    ...recommendations,
    '',
    '## Cấu hình an toàn',
    '',
    '- Browser chạy headful (`headless: false`).',
    '- Mật khẩu chỉ đọc từ biến môi trường `AUDIT_CUSTOMER_PASSWORD` và `AUDIT_ADMIN_PASSWORD`; không ghi vào script hoặc báo cáo.',
    '- Suite tạo đơn/giả lập thanh toán chỉ chạy khi đặt `ALLOW_AUDIT_TRANSACTIONS=1`; production còn cần `ALLOW_PRODUCTION_AUDIT=1`.',
    '- Đơn audit được hủy và hoàn tồn ở bước cleanup khi admin login thành công.',
    '',
  ].join('\n');
}

async function main(): Promise<void> {
  await mkdir(artifactsDirectory, { recursive: true });
  try {
    browser = await chromium.launch({ headless: false });
    context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
    page = await context.newPage();
    page.setDefaultTimeout(12_000);
    page.on('request', (request) => {
      if (isApiUrl(request.url())) requestStartedAt.set(request, performance.now());
    });
    page.on('requestfinished', (request) => {
      const started = requestStartedAt.get(request);
      if (started !== undefined) apiLatencies.push(performance.now() - started);
    });
    page.on('pageerror', (error) => pageErrors.push(error.message));

    await runStep(1, 'Storefront', 'Hero, Marquee, Before/After và 3D Coverflow', async () => {
      await navigate('/');
      assert(await page!.locator('.hero').isVisible(), 'Hero banner chưa hiển thị.');
      assert(await page!.getByRole('region', { name: 'Thông điệp thương hiệu Mắc Khén Farm' }).isVisible(), 'Marquee chưa hiển thị.');
      assert(await page!.getByRole('slider', { name: /Kéo để so sánh/ }).isVisible(), 'Before/After slider chưa hiển thị.');
      assert(await page!.getByRole('heading', { name: /TRIỂN LÃM NÔNG SẢN TÂY BẮC 360°|360° NORTHWEST PRODUCT SHOWCASE/i }).isVisible(), 'Khối 3D Coverflow 360° chưa hiển thị.');
    });

    await runStep(2, 'Storefront', 'Tìm kiếm mắc khén và lọc danh mục', async () => {
      await navigate('/products');
      const response = await context!.request.get(pathFor('/api/products'));
      assert(response.ok(), `API sản phẩm trả HTTP ${response.status()}.`);
      const payload = await response.json() as { items?: Product[] };
      const products = payload.items ?? [];
      const spiceProducts = products.filter((product) => product.category === 'Gia vị Tây Bắc');
      productChoice = chooseProduct(spiceProducts.filter((product) => normalizeSearch(`${product.name} ${product.category}`).includes('mac khen')))
        ?? chooseProduct(spiceProducts);
      const search = page!.locator('.catalog-search-field input');
      await search.fill('mắc khén');
      const categoryTab = page!.getByRole('tab', { name: /Gia vị & Chẳm chéo Tây Bắc|Northwest spices/i });
      await categoryTab.click();
      const productCards = page!.locator('.catalog-products .product-card');
      await productCards.first().waitFor({ state: 'visible', timeout: 10_000 });
      assert(await productCards.count() > 0, 'Không tìm thấy sản phẩm sau khi tìm “mắc khén” và lọc danh mục.');
      assert(productChoice, 'Không có gia vị đủ tồn kho để tiếp tục kiểm thử.');
      await search.fill(productChoice.product.name);
      await page!.locator(`.catalog-products a[href="/products/${productChoice.product.slug}"]`).first().waitFor({ state: 'visible' });
    });

    await runStep(3, 'Storefront', 'Điều hướng từ kết quả đến chi tiết sản phẩm', async () => {
      const firstProductLink = page!.locator('.catalog-products .product-card a[href^="/products/"]').first();
      await firstProductLink.click();
      await page!.waitForURL(/\/products\/[^/]+$/);
      productDetailPath = new URL(page!.url()).pathname;
      assert(/^\/products\/.+/.test(productDetailPath), `URL chi tiết không đúng: ${productDetailPath}`);
      assert(await page!.locator('.cart-add-control').isVisible(), 'Trang chi tiết không có khối mua hàng.');
    });

    if (!allowTransactions) {
      const reason = 'Đang tắt giao dịch ghi DB. Đặt ALLOW_AUDIT_TRANSACTIONS=1 trên local/test; production cần thêm ALLOW_PRODUCTION_AUDIT=1.';
      for (const [stepNumber, name] of [[4, 'Thêm giỏ, tiến trình Freeship và số lượng'], [5, 'Checkout, đăng nhập test và xác thực FREESHIP'], [6, 'Đặt đơn VietQR từ form giao hàng'], [7, 'QR, mã đơn, đồng hồ và nút in hóa đơn']] as const) skipStep(stepNumber, 'Cart / Checkout', name, reason);
    } else if (!auditCustomerEmail || !auditCustomerPassword) {
      const reason = 'Thiếu AUDIT_CUSTOMER_EMAIL hoặc AUDIT_CUSTOMER_PASSWORD để kiểm thử voucher yêu cầu đăng nhập.';
      for (const [stepNumber, name] of [[4, 'Thêm giỏ, tiến trình Freeship và số lượng'], [5, 'Checkout, đăng nhập test và xác thực FREESHIP'], [6, 'Đặt đơn VietQR từ form giao hàng'], [7, 'QR, mã đơn, đồng hồ và nút in hóa đơn']] as const) skipStep(stepNumber, 'Cart / Checkout', name, reason);
    } else {
      await runStep(4, 'Cart / Checkout', 'Thêm giỏ, tiến trình Freeship và số lượng', async () => {
        assert(productChoice && productDetailPath, 'Không chọn được sản phẩm có tồn kho phù hợp cho checkout.');
        await navigate(productDetailPath);
        if (productChoice.variant && productChoice.product.variants && productChoice.product.variants.length > 1) {
          await page!.locator('.cart-add-control select').selectOption(productChoice.variant.id);
        }
        await page!.locator('#product-quantity').fill(String(productChoice.quantity));
        const cartResponse = page!.waitForResponse((response) => response.url().includes('/api/cart/items') && response.request().method() === 'POST');
        await page!.locator('.cart-add-control button.primary-action').first().click();
        assert((await cartResponse).ok(), 'API thêm giỏ không thành công.');
        await navigate('/cart');
        await page!.locator('.cart-item').first().waitFor({ state: 'visible' });
        assert(await page!.locator('.cart-free-shipping [role="progressbar"]').isVisible(), 'Thanh tiến trình Freeship không hiển thị.');
        const quantity = page!.locator('.cart-item-controls input[type="number"]').first();
        const initialQuantity = Number(await quantity.inputValue());
        await page!.getByRole('button', { name: /Tăng số lượng/ }).first().click();
        await page!.waitForFunction((value) => Number(document.querySelector<HTMLInputElement>('.cart-item-controls input[type="number"]')?.value) === value, initialQuantity + 1);
        await page!.getByRole('button', { name: /Giảm số lượng/ }).first().click();
        await page!.waitForFunction((value) => Number(document.querySelector<HTMLInputElement>('.cart-item-controls input[type="number"]')?.value) === value, initialQuantity);
      });

      await runStep(5, 'Cart / Checkout', 'Checkout, đăng nhập test và xác thực FREESHIP server-side', async () => {
        await navigate('/dang-nhap?callbackUrl=%2Fcheckout');
        await page!.locator('#email').fill(auditCustomerEmail);
        await page!.locator('#password').fill(auditCustomerPassword);
        await page!.getByRole('button', { name: /đăng nhập|sign in/i }).click();
        await page!.waitForURL((url) => url.pathname === '/checkout' || url.pathname === '/checkout/', { timeout: 20_000 });
        await page!.locator('#name').fill(`MHF Audit ${Date.now()}`);
        const auditPhone = process.env.AUDIT_PHONE ?? `09${String(Math.floor(Math.random() * 10_000_000)).padStart(8, '0')}`;
        await page!.locator('#phone').fill(auditPhone);
        await page!.locator('#voucher').fill('FREESHIP');
        const voucherResponse = page!.waitForResponse((response) => response.url().includes('/api/checkout/voucher') && response.request().method() === 'POST');
        await page!.getByRole('button', { name: /^Áp dụng$|^Apply$/i }).click();
        const apiResponse = await voucherResponse;
        const result = await apiResponse.json() as { code?: string; discount?: number; subtotal?: number; shipping?: number; error?: { message?: string } };
        assert(apiResponse.ok(), `Voucher FREESHIP không được server chấp nhận: ${result.error?.message ?? apiResponse.status()}.`);
        assert(result.code === 'FREESHIP' && result.subtotal !== undefined && result.discount === result.shipping, 'Server discount không khớp phí vận chuyển hoặc subtotal.');
        assert(result.subtotal >= 250_000, `Subtotal ${result.subtotal} chưa đạt ngưỡng FREESHIP 250.000đ.`);
        assert(await page!.locator('.checkout-voucher-success').isVisible(), 'Giao diện chưa xác nhận voucher thành công.');
        await prepareCheckoutAddress();
      });

      await runStep(6, 'Cart / Checkout', 'Đặt đơn VietQR từ form giao hàng', async () => {
        await page!.locator('input[name="method"][value="VIETQR"]').check();
        await page!.locator('form.form-list button[type="submit"]').click();
        await page!.waitForURL(/\/checkout\/vietqr\/MKF-\d{6}/, { timeout: 60_000 });
        createdOrderCode = new URL(page!.url()).pathname.split('/').pop();
        assert(createdOrderCode && /^MKF-\d{6}$/.test(createdOrderCode), 'Không lấy được mã đơn VietQR.');
      });

      await runStep(7, 'Cart / Checkout', 'QR MB Bank, mã đơn, đồng hồ và thao tác in/Lưu PDF', async () => {
        assert(createdOrderCode, 'Bỏ qua vì chưa tạo được đơn VietQR.');
        const qrImg = page!.locator('img[alt*="VietQR"], img[src*="vietqr"], .vietqr-image img').first();
        await qrImg.waitFor({ state: 'visible', timeout: 10_000 });
        await page!.waitForFunction(
          (element) => (element as HTMLImageElement).complete && (element as HTMLImageElement).naturalWidth > 0,
          await qrImg.elementHandle(),
          { timeout: 10_000 }
        );
        assert(await page!.getByText(createdOrderCode, { exact: false }).count() > 0, 'Không hiển thị mã đơn.');
        assert(await page!.getByText(/Mã QR hết hạn sau \d{2}:\d{2}/).isVisible(), 'Đồng hồ hết hạn QR chưa hiển thị.');
        const printBtn = page!.locator('button, a').filter({
          hasText: /(in hóa đơn|lưu pdf|in phiếu|print|pdf|receipt)/i,
        }).first();
        if (await printBtn.count() > 0) {
          console.log('  ✓ Đã tìm thấy nút in hóa đơn / lưu PDF');
        } else {
          const printAlt = page!.locator('[data-testid="print-receipt"], .btn-print, button:has-text("In")').first();
          await printAlt.waitFor({ timeout: 5_000 });
        }
      });
    }

    if (!auditAdminPassword) {
      const reason = 'Thiếu AUDIT_ADMIN_PASSWORD; không hardcode mật khẩu quản trị trong script.';
      for (const [stepNumber, name] of [[8, 'Đăng nhập Admin'], [9, 'Kiểm tra cột ATP WMS'], [10, 'Giả lập VietQR và xác nhận đơn PAID'], [11, 'Phiếu in có barcode và SHA-256']] as const) skipStep(stepNumber, 'Admin', name, reason);
    } else {
      await runStep(8, 'Admin', 'Đăng nhập Admin', async () => {
        await loginWithCredentials(auditAdminEmail, auditAdminPassword, '/admin');
        adminSignedIn = true;
      });
      if (adminSignedIn) {
        await runStep(9, 'Admin', 'Kiểm tra các cột tồn kho ATP', async () => {
          await navigate('/admin/inventory');
          for (const column of [/Tồn thực tế/i, /Đang giữ trong đơn/i, /Khả dụng bán \(ATP\)/i]) {
            assert(await page!.getByRole('columnheader', { name: column }).isVisible(), `Thiếu cột tồn kho ${column}.`);
          }
        });
      } else {
        for (const [stepNumber, name] of [[9, 'Kiểm tra cột ATP WMS'], [10, 'Giả lập VietQR và xác nhận đơn PAID'], [11, 'Phiếu in có barcode và SHA-256']] as const) skipStep(stepNumber, 'Admin', name, 'Không đăng nhập được Admin ở bước 8.');
      }

      if (adminSignedIn && createdOrderCode && allowTransactions) {
        await runStep(10, 'Admin', 'Giả lập VietQR và xác nhận đơn PAID', async () => {
          await navigate('/admin/orders');
          await page!.getByRole('textbox', { name: /Tìm theo mã đơn/ }).fill(createdOrderCode!);
          const orderCard = page!.locator('.admin-order').filter({ hasText: createdOrderCode! });
          await orderCard.waitFor({ state: 'visible' });
          await orderCard.getByRole('button', { name: /Giả lập Quét VietQR \(Demo\)/ }).click();
          await orderCard.locator('.badge, [data-status], span').filter({ hasText: 'Đã thanh toán' }).first().waitFor({ state: 'visible', timeout: 20_000 });
        });
        await runStep(11, 'Admin', 'Phiếu in có Barcode SVG và checksum SHA-256', async () => {
          await navigate(`/admin/orders/print/${encodeURIComponent(createdOrderCode!)}`);
          assert(await page!.locator('svg[aria-label^="Barcode Code128"]').isVisible(), 'Barcode SVG không hiển thị.');
          assert(await page!.getByText(/SHA-256 Digital Checksum/).isVisible(), 'Checksum SHA-256 không hiển thị.');
        });
      } else {
        const reason = !createdOrderCode ? 'Không có mã đơn VietQR từ Suite 2.' : 'Bật ALLOW_AUDIT_TRANSACTIONS=1 để chạy thao tác giả lập/thanh toán.';
        skipStep(10, 'Admin', 'Giả lập VietQR và xác nhận đơn PAID', reason);
        skipStep(11, 'Admin', 'Phiếu in có Barcode SVG và checksum SHA-256', reason);
      }
    }

    await runStep(12, 'Traceability / Legal', 'Tra cứu mã lô và xác nhận 4 công đoạn chuỗi cung ứng', async () => {
      await navigate('/truy-xuat');
      await page!.locator('#batch-code').fill('BATCH-KB-2026-01');
      await page!.getByRole('button', { name: /^Tra cứu$/ }).click();
      const steps = page!.locator('.traceability-step');
      await steps.first().waitFor({ state: 'visible' });
      assert(await steps.count() === 4, `Mã lô phải có 4 công đoạn, hiện có ${await steps.count()}.`);
    });

    await runStep(13, 'Traceability / Legal', 'Kiểm tra trang chính sách bảo mật Nghị định 13', async () => {
      await navigate('/chinh-sach-bao-mat');
      assert(await page!.getByRole('heading', { name: /CHÍNH SÁCH BẢO VỆ DỮ LIỆU CÁ NHÂN/i }).isVisible(), 'Thiếu tiêu đề chính sách bảo mật.');
      assert(await page!.getByText(/Nghị định số 13\/2023\/NĐ-CP/).isVisible(), 'Không thấy căn cứ Nghị định 13/2023/NĐ-CP.');
    });

    await runStep(14, 'Traceability / Legal', 'Chuyển SGD/English và rà trang chính', async () => {
      await navigate('/');
      await page!.getByRole('button', { name: 'SGD' }).click();
      await page!.getByRole('heading', { name: /360° NORTHWEST PRODUCT SHOWCASE/i }).waitFor({ state: 'visible' });
      assert(await page!.getByRole('navigation', { name: 'Main menu' }).isVisible(), 'Switcher chưa đổi ngôn ngữ menu sang tiếng Anh.');
      for (const route of ['/products', '/cart', '/checkout', '/tra-cuu']) {
        await navigate(route);
        assert(await page!.locator('main').isVisible(), `Trang ${route} không hiển thị.`);
      }
      await navigate('/products');
      await page!.waitForFunction(() => document.querySelector('.catalog-products')?.textContent?.includes('S$') ?? false, undefined, { timeout: 15_000 });
      const productText = await page!.locator('.catalog-products').innerText();
      assert(productText.includes('S$'), 'Giá sản phẩm chưa chuyển sang S$.');
      const searchPlaceholder = await page!.locator('.catalog-search-field input').getAttribute('placeholder');
      assert(searchPlaceholder?.toLowerCase().includes('search products'), 'Search control chưa chuyển sang tiếng Anh.');
    });

    if (createdOrderCode && adminSignedIn && allowTransactions) {
      try {
        const response = await context!.request.patch(pathFor('/api/admin/orders'), {
          data: { orderCode: createdOrderCode, status: 'CANCELLED', cancelReason: 'Automated audit cleanup - không giao hàng' },
        });
        if (!response.ok()) console.warn(`Order cleanup returned HTTP ${response.status()}.`);
      } catch (error) {
        console.warn('Order cleanup failed:', error instanceof Error ? error.message : error);
      }
    }
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Không khởi động được Playwright audit.';
    results.push({ step: 0, suite: 'Preflight', name: 'Khởi chạy browser / audit', status: 'FAIL', durationMs: 0, detail });
    console.error(`AUDIT PREFLIGHT FAIL: ${detail}`);
  } finally {
    await writeFile(reportPath, formatReport(), 'utf8');
    console.log(`\nBáo cáo: ${reportPath}`);
    console.log(`Screenshots: ${artifactsDirectory}`);
    if (browser) await browser.close();
  }

  if (results.some((result) => result.status === 'FAIL')) process.exitCode = 1;
}

void main();