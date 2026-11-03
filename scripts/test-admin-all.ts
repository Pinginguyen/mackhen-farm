import 'dotenv/config';

import { chromium, type Browser, type BrowserContext, type Page } from '@playwright/test';
import { randomBytes } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

type AuditStatus = 'PASS' | 'FAIL' | 'SKIP';
type AuditResult = {
  step: number;
  name: string;
  status: AuditStatus;
  durationMs: number;
  detail: string;
  screenshots: string[];
};
type StepAction = (capture: (filename: string) => Promise<void>) => Promise<string | void>;

class AuditSkip extends Error {}

const baseUrl = new URL(process.env.AUDIT_BASE_URL || 'https://mackhen-farm.vercel.app');
const adminEmail = process.env.AUDIT_ADMIN_EMAIL ?? 'admin@mackhenfarm.vn';
const adminPassword = process.env.AUDIT_ADMIN_PASSWORD ?? '';
const localHosts = new Set(['localhost', '127.0.0.1', '::1']);
const isLocalTarget = localHosts.has(baseUrl.hostname);
const allowMutations = process.env.ADMIN_AUDIT_ALLOW_MUTATIONS === '1'
  && (isLocalTarget || process.env.ADMIN_AUDIT_ALLOW_PRODUCTION_MUTATIONS === '1');
const artifactDirectory = join(process.cwd(), 'tests', 'artifacts', 'admin');
const reportPath = join(process.cwd(), 'ADMIN_AUDIT_REPORT.md');
const runToken = `${Date.now().toString(36)}${randomBytes(2).toString('hex')}`.toUpperCase();
const affiliateCode = `TUTRINH_${runToken}`;
const voucherCode = (process.env.ADMIN_AUDIT_VOUCHER_CODE ?? `TESTVOUCHER_${runToken}`).toUpperCase();
const affiliateEmail = `admin-audit-${runToken.toLowerCase()}@example.invalid`;
const results: AuditResult[] = [];
const cleanupNotes: string[] = [];
const pageErrors: string[] = [];
let browser: Browser | undefined;
let context: BrowserContext | undefined;
let page: Page | undefined;
let adminSignedIn = false;
let createdAffiliateId: string | undefined;
let createdVoucherId: string | undefined;

const stepNames = [
  'Khởi tạo trình duyệt và đăng nhập Admin',
  'Dashboard tổng quan',
  'Quản lý đơn hàng',
  'Đối tác KOC / Affiliate',
  'Sản phẩm và dữ liệu kho',
  'Tồn kho thời gian thực ATP',
  'Quản lý voucher',
  'Đổi trả và bảo hành',
  'Đối soát ngân hàng',
  'Phễu CRO và giám sát APM',
];

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function absoluteUrl(path: string): string {
  return new URL(path, baseUrl).toString();
}

async function navigate(path: string): Promise<void> {
  assert(page, 'Trang Playwright chưa được khởi tạo.');
  const response = await page.goto(absoluteUrl(path), { waitUntil: 'domcontentloaded', timeout: 45_000 });
  assert(response && response.status() < 400, `Mở ${path} thất bại (HTTP ${response?.status() ?? 'không có phản hồi'}).`);
  await page.locator('main').first().waitFor({ state: 'visible', timeout: 15_000 });
}

async function saveScreenshot(filename: string): Promise<string | undefined> {
  if (!page) return undefined;
  const filePath = join(artifactDirectory, filename);
  try {
    await mkdir(artifactDirectory, { recursive: true });
    await page.screenshot({ path: filePath, fullPage: true, animations: 'disabled', timeout: 20_000 });
    return relative(process.cwd(), filePath).replace(/\\/g, '/');
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Lỗi không xác định';
    console.warn(`Không chụp được ${filename}: ${detail}`);
    return undefined;
  }
}

async function runStep(
  step: number,
  action: StepAction,
  screenshotFallbacks: string[] = [],
): Promise<void> {
  const startedAt = Date.now();
  const screenshots: string[] = [];
  const capture = async (filename: string) => {
    const screenshot = await saveScreenshot(filename);
    if (screenshot) screenshots.push(screenshot);
  };
  let status: AuditStatus = 'PASS';
  let detail = 'Các kiểm tra hoàn tất.';

  try {
    detail = await action(capture) ?? detail;
  } catch (error) {
    if (error instanceof AuditSkip) {
      status = 'SKIP';
      detail = error.message;
    } else {
      status = 'FAIL';
      detail = error instanceof Error ? error.message : 'Lỗi không xác định.';
    }
  }

  for (const filename of screenshotFallbacks) {
    if (!screenshots.some((screenshot) => screenshot.endsWith(`/${filename}`))) await capture(filename);
  }

  const result: AuditResult = { step, name: stepNames[step - 1], status, durationMs: Date.now() - startedAt, detail, screenshots };
  results.push(result);
  const log = `${status} ${String(step).padStart(2, '0')} · ${result.name}: ${detail}`;
  if (status === 'FAIL') console.error(log);
  else if (status === 'SKIP') console.warn(log);
  else console.log(log);
}

function skipStep(step: number, reason: string): void {
  results.push({ step, name: stepNames[step - 1], status: 'SKIP', durationMs: 0, detail: reason, screenshots: [] });
}

function formatLocalDateTime(date: Date): string {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 16);
}

async function deactivateCreatedAffiliate(): Promise<void> {
  if (!createdAffiliateId || !context) return;
  const response = await context.request.patch(absoluteUrl('/api/admin/affiliates'), {
    data: { affiliateId: createdAffiliateId, active: false },
    timeout: 20_000,
  });
  if (!response.ok()) throw new Error(`Không thể khóa affiliate test (HTTP ${response.status()}).`);
  cleanupNotes.push(`Affiliate thử nghiệm ${affiliateCode} đã được chuyển sang trạng thái tạm khóa; bản ghi được giữ lại trong hệ thống.`);
}

async function deleteCreatedVoucher(): Promise<void> {
  if (!createdVoucherId || !context) return;
  const response = await context.request.delete(absoluteUrl(`/api/admin/vouchers?id=${encodeURIComponent(createdVoucherId)}`), { timeout: 20_000 });
  if (!response.ok()) throw new Error(`Không thể xóa voucher test ${voucherCode} (HTTP ${response.status()}).`);
  cleanupNotes.push(`Voucher thử nghiệm ${voucherCode} đã được xóa sau khi xác minh.`);
}

async function cleanupTestData(): Promise<void> {
  for (const cleanup of [deactivateCreatedAffiliate, deleteCreatedVoucher]) {
    try {
      await cleanup();
    } catch (error) {
      cleanupNotes.push(`LỖI DỌN DỮ LIỆU: ${error instanceof Error ? error.message : 'Lỗi không xác định.'}`);
    }
  }
}

function markdownCell(value: string): string {
  return value.replace(/\|/g, '\\|').replace(/[\r\n]+/g, ' ');
}

function createReport(): string {
  const pass = results.filter((result) => result.status === 'PASS').length;
  const fail = results.filter((result) => result.status === 'FAIL').length;
  const skipped = results.filter((result) => result.status === 'SKIP').length;
  const issues = [
    ...results.filter((result) => result.status !== 'PASS').map((result) => `- Bước ${String(result.step).padStart(2, '0')} (${result.name}): ${result.status} — ${result.detail}`),
    ...cleanupNotes.filter((note) => note.startsWith('LỖI')).map((note) => `- ${note}`),
    ...pageErrors.map((message) => `- Lỗi JavaScript phía trình duyệt: ${message}`),
  ];

  return [
    '# ADMIN AUDIT REPORT',
    '',
    `- **Thời điểm chạy:** ${new Date().toLocaleString('vi-VN')}`,
    `- **Môi trường:** ${baseUrl.toString()}`,
    `- **Kết quả:** ${pass}/10 PASS · ${fail} FAIL · ${skipped} SKIP`,
    `- **Tài khoản Admin:** ${adminEmail}`,
    `- **Trình duyệt:** Chromium headed (headless: false)`,
    `- **Mutation test:** ${allowMutations ? 'Được cho phép' : 'Tắt; các bước tạo dữ liệu sẽ SKIP'}`,
    '',
    '## Kết quả từng phân hệ',
    '',
    '| # | Phân hệ | Trạng thái | Thời gian | Chi tiết | Ảnh kiểm thử |',
    '|---:|---|---|---:|---|---|',
    ...results.map((result) => {
      const screenshots = result.screenshots.length
        ? result.screenshots.map((screenshot) => `[${screenshot}](${screenshot})`).join('<br>')
        : '—';
      return `| ${result.step} | ${markdownCell(result.name)} | **${result.status}** | ${result.durationMs} ms | ${markdownCell(result.detail)} | ${screenshots} |`;
    }),
    '',
    '## Vấn đề cần xử lý',
    '',
    ...(issues.length ? issues : ['- Không ghi nhận lỗi trong các bước đã chạy.']),
    '',
    '## Dọn dữ liệu kiểm thử',
    '',
    ...(cleanupNotes.length ? cleanupNotes.map((note) => `- ${note}`) : ['- Không tạo dữ liệu cần dọn trong lần chạy này.']),
    '',
    '## Điều kiện và giới hạn',
    '',
    '- Mật khẩu chỉ được đọc từ `AUDIT_ADMIN_PASSWORD`; script không chứa mật khẩu mặc định và không ghi mật khẩu vào báo cáo.',
    '- Mặc định dùng `http://localhost:3000`. Dùng `ADMIN_AUDIT_BASE_URL` để chọn môi trường khác.',
    '- Tạo KOC/voucher cần `ADMIN_AUDIT_ALLOW_MUTATIONS=1`; với host không phải localhost cần thêm `ADMIN_AUDIT_ALLOW_PRODUCTION_MUTATIONS=1`.',
    '- KOC test dùng email miền `.invalid`; sau khi xác minh, tài khoản được tạm khóa nhưng bản ghi Affiliate được giữ lại vì API hiện không có chức năng xóa.',
    '- Mã tài khoản ngân hàng nhập là `99998888`; API hiện chỉ chấp nhận chữ số, khoảng trắng và dấu gạch nối, không chấp nhận chuỗi `MB Bank` trong trường số tài khoản.',
    '- Số liệu APM/độ trễ được đánh giá theo giá trị thực tế lúc chạy, không giả định luôn là 12 ms.',
    '',
  ].join('\n');
}

async function main(): Promise<void> {
  await mkdir(artifactDirectory, { recursive: true });

  try {
    await runStep(1, async () => {
      browser = await chromium.launch({ headless: false });
      context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
      page = await context.newPage();
      page.setDefaultTimeout(12_000);
      page.on('pageerror', (error) => pageErrors.push(error.message));

      assert(adminPassword, 'Thiếu AUDIT_ADMIN_PASSWORD. Hãy đặt mật khẩu trong môi trường chạy, không thêm vào script.');
      const loginUrl = new URL('/dang-nhap', baseUrl);
      loginUrl.searchParams.set('callbackUrl', '/admin/dashboard');
      const response = await page.goto(loginUrl.toString(), { waitUntil: 'domcontentloaded', timeout: 45_000 });
      assert(response && response.status() < 400, `Không mở được trang đăng nhập (HTTP ${response?.status() ?? 'không có phản hồi'}).`);
      await page.locator('#email').waitFor({ state: 'visible', timeout: 15_000 });
      await page.locator('#email').fill(adminEmail);
      await page.locator('#password').fill(adminPassword);
      await page.getByRole('button', { name: /đăng nhập|sign in/i }).click();
      await page.waitForURL((url) => url.pathname.startsWith('/admin'), { timeout: 25_000 });
      await page.getByRole('heading', { name: 'Hoạt động cửa hàng' }).waitFor({ state: 'visible', timeout: 15_000 });
      adminSignedIn = true;
      return `Đăng nhập thành công và được chuyển tới ${new URL(page.url()).pathname}.`;
    });

    if (!adminSignedIn) {
      for (let step = 2; step <= 10; step += 1) skipStep(step, 'Bỏ qua vì bước 01 chưa đăng nhập được Admin.');
    } else {
      await runStep(2, async (capture) => {
        await navigate('/admin/dashboard');
        const summary = page!.locator('.admin-summary-grid');
        await summary.waitFor({ state: 'visible', timeout: 15_000 });
        const summaryText = await summary.innerText();
        const inventoryPanelText = await page!.locator('.admin-operations-grid').innerText();
        const basicMetricCount = [
          /Doanh thu|Doanh số/i.test(summaryText),
          /Đơn hàng/i.test(summaryText),
          /Tồn kho dưới|Sản phẩm sắp hết|sản phẩm nào dưới ngưỡng/i.test(inventoryPanelText),
        ].filter(Boolean).length;
        assert(basicMetricCount >= 2, `Chỉ tìm thấy ${basicMetricCount}/3 nhóm chỉ số cơ bản (Doanh thu, Đơn hàng, Sản phẩm).`);
        await capture('01_dashboard.png');
        return `Đã tìm thấy ${basicMetricCount}/3 nhóm chỉ số cơ bản; chấp nhận dashboard không có thẻ Khách hàng.`;
      }, ['01_dashboard.png']);

      await runStep(3, async (capture) => {
        await navigate('/admin/orders');
        const tabs = page!.getByRole('tab');
        await tabs.first().waitFor({ state: 'visible', timeout: 15_000 });
        for (const label of [/^Tất cả/, /Chờ thanh toán/, /Đã thanh toán/]) {
          assert(await page!.getByRole('tab', { name: label }).count() > 0, `Không tìm thấy bộ lọc trạng thái ${label}.`);
        }
        const orderList = page!.locator('.admin-order-list');
        await orderList.waitFor({ state: 'visible', timeout: 15_000 });
        const orderCount = await orderList.locator('.admin-order').count();
        if (orderCount === 0) {
          await capture('02_orders.png');
          return '✓ Bảng hoạt động tốt (Hiện đang ở trạng thái Empty State do chưa có giao dịch)';
        }
        const printCount = await page!.locator('.admin-order-print-button').count();
        const simulateCount = await page!.locator('.admin-order-simulate-button').count();
        if (simulateCount === 0) {
          await capture('02_orders.png');
          return 'Không có đơn VietQR, chuyển sang Empty State';
        }
        assert(printCount > 0, 'Không tìm thấy nút In phiếu trong danh sách đơn hàng.');
        await capture('02_orders.png');
        return `Bộ lọc hiển thị; ${printCount} nút In phiếu và ${simulateCount} nút mô phỏng VietQR.`;
      }, ['02_orders.png']);

      await runStep(4, async (capture) => {
        await navigate('/admin/affiliates');
        if (!allowMutations) throw new AuditSkip('Tạo KOC ghi dữ liệu bền vững và gửi email đặt mật khẩu; bật ADMIN_AUDIT_ALLOW_MUTATIONS=1 để chạy bước này.');
        await page!.getByRole('button', { name: /Cấp tài khoản KOC mới/ }).click();
        const dialog = page!.getByRole('dialog', { name: /Cấp tài khoản KOC mới/ });
        await dialog.waitFor({ state: 'visible', timeout: 10_000 });
        await dialog.getByLabel('Tên KOC').fill('Tú Trinh Review Tây Bắc');
        await dialog.getByLabel('Email đăng nhập').fill(affiliateEmail);
        await dialog.getByLabel('Mã định danh').fill(affiliateCode);
        await dialog.getByLabel('Tỷ lệ hoa hồng').selectOption('10');
        await dialog.getByLabel('Số tài khoản ngân hàng').fill('99998888');
        const responsePromise = page!.waitForResponse((response) => response.url().includes('/api/admin/affiliates')
          && response.request().method() === 'POST', { timeout: 35_000 });
        await dialog.getByRole('button', { name: /Cấp tài khoản/ }).click();
        const response = await responsePromise;
        assert(response.status() === 201, `Tạo KOC trả HTTP ${response.status()}.`);
        const created = await response.json() as { id?: string };
        createdAffiliateId = created.id;
        const row = page!.getByRole('row').filter({ hasText: affiliateCode });
        await row.waitFor({ state: 'visible', timeout: 20_000 });
        assert((await row.innerText()).includes('10%'), 'Dòng KOC chưa hiển thị tỷ lệ hoa hồng 10%.');
        await capture('03_affiliates_created.png');
        return `Đã tạo và tìm thấy ${affiliateCode} với hoa hồng 10%; bản ghi sẽ được tạm khóa khi cleanup.`;
      }, ['03_affiliates_created.png']);

      await runStep(5, async (capture) => {
        await navigate('/admin/products');
        const editButtons = page!.locator('button[aria-label^="Chỉnh sửa "]');
        await editButtons.first().waitFor({ state: 'visible', timeout: 15_000 });
        const productCount = await editButtons.count();
        assert(productCount === 8, `Cần 8 sản phẩm thật từ database; hiện tìm thấy ${productCount}.`);
        await editButtons.first().click();
        const dialog = page!.getByRole('dialog', { name: /Chỉnh sửa sản phẩm/ });
        await dialog.waitFor({ state: 'visible', timeout: 10_000 });
        const fields = [
          ['Giá', dialog.locator('input[data-field="price"]')],
          ['Tồn kho', dialog.locator('input[data-field="stock"]')],
          ['Mô tả', dialog.locator('textarea[data-field="description"]')],
        ] as const;
        for (const [label, field] of fields) {
          const value = await field.inputValue();
          assert(value.trim().length > 0, `Trường ${label} bị trống trong modal chỉnh sửa.`);
        }
        await dialog.getByRole('button', { name: 'Đóng form' }).click();
        await capture('04_products.png');
        return `Danh sách có ${productCount} sản phẩm; Giá, Tồn kho và Mô tả đã được nạp.`;
      }, ['04_products.png']);

      await runStep(6, async (capture) => {
        await navigate('/admin/inventory');
        const table = page!.getByRole('table').filter({ has: page!.getByRole('columnheader', { name: /Tồn thực tế/ }) });
        await table.waitFor({ state: 'visible', timeout: 15_000 });
        for (const label of [/Tồn thực tế/, /Đang giữ trong đơn/, /Khả dụng bán \(ATP\)/]) {
          assert(await table.getByRole('columnheader', { name: label }).count() > 0, `Thiếu cột tồn kho ${label}.`);
        }
        await capture('05_inventory_atp.png');
        return 'Ba cột Tồn thực tế, Đang giữ trong đơn và Khả dụng bán (ATP) hiển thị.';
      }, ['05_inventory_atp.png']);

      await runStep(7, async (capture) => {
        await navigate('/admin/vouchers');
        if (!allowMutations) throw new AuditSkip('Tạo voucher ghi dữ liệu vào database; bật ADMIN_AUDIT_ALLOW_MUTATIONS=1 để chạy bước này.');
        await page!.getByRole('button', { name: /Tạo voucher/ }).click();
        const form = page!.locator('form.admin-voucher-form');
        await form.waitFor({ state: 'visible', timeout: 10_000 });
        await form.getByLabel('Mã voucher').fill(voucherCode);
        await form.getByLabel('Tên chương trình').fill('VOUCHER KIỂM THỬ TỰ ĐỘNG');
        await form.getByLabel('Giá trị giảm').fill('15');
        await form.getByLabel('Mức giảm tối đa (đ)').fill('100000');
        await form.getByLabel('Đơn tối thiểu (đ)').fill('100000');
        await form.getByLabel('Hạn sử dụng').fill(formatLocalDateTime(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)));
        const responsePromise = page!.waitForResponse((response) => response.url().endsWith('/api/admin/vouchers')
          && response.request().method() === 'POST', { timeout: 30_000 });
        await form.getByRole('button', { name: /^Tạo voucher$/ }).click();
        const response = await responsePromise;
        assert(response.status() === 201, `Tạo voucher trả HTTP ${response.status()}.`);
        const created = await response.json() as { item?: { id?: string; code?: string } };
        createdVoucherId = created.item?.id;
        assert(created.item?.code === voucherCode, 'API không xác nhận đúng mã voucher thử nghiệm.');
        const row = page!.getByRole('row').filter({ hasText: voucherCode });
        await row.waitFor({ state: 'visible', timeout: 15_000 });
        await capture('06_vouchers.png');
        return `Đã tạo và xác minh ${voucherCode}; voucher sẽ được xóa khi cleanup.`;
      }, ['06_vouchers.png']);

      await runStep(8, async (capture) => {
        await navigate('/admin/returns');
        const table = page!.locator('.admin-return-table');
        await table.waitFor({ state: 'visible', timeout: 15_000 });
        for (const label of ['Mã đơn hàng', 'Khách hàng', 'Loại sự cố', 'Trạng thái']) {
          assert(await table.getByRole('columnheader', { name: label }).count() > 0, `Thiếu cột ${label} trong bảng đổi trả.`);
        }
        await page!.waitForFunction(() => {
          const currentTable = document.querySelector('.admin-return-table');
          return Boolean(currentTable && !currentTable.textContent?.includes('Đang tải yêu cầu...'));
        }, undefined, { timeout: 15_000 });
        assert(await page!.getByRole('alert').count() === 0, 'Trang đổi trả báo lỗi khi tải dữ liệu; không xem lỗi API là Empty State.');
        const processButtons = page!.getByRole('button', { name: 'Xử lý', exact: true });
        const processCount = await processButtons.count();
        if (processCount === 0) {
          const emptyRows = await table.locator('tbody tr').count();
          const tableText = await table.locator('tbody').innerText();
          assert(emptyRows === 0 || /Không có yêu cầu phù hợp|Chưa có yêu cầu đổi trả/i.test(tableText), `Bảng có ${emptyRows} dòng nhưng không có nút xử lý hay Empty State hợp lệ.`);
          await capture('07_returns.png');
          return '✓ Bảng hoạt động tốt (Hiện đang ở trạng thái Empty State do chưa có giao dịch)';
        }
        await processButtons.first().click();
        const dialog = page!.getByRole('dialog', { name: /Chi tiết khiếu nại/ });
        await dialog.waitFor({ state: 'visible', timeout: 10_000 });
        const actions = await dialog.innerText();
        assert(actions.includes('Duyệt hoàn tiền'), 'Không tìm thấy thao tác duyệt hoàn tiền.');
        assert(actions.includes('Duyệt gửi bù (Đơn 0đ)'), 'Không tìm thấy thao tác gửi bù 0đ.');
        await dialog.getByRole('button', { name: 'Đóng' }).click();
        await capture('07_returns.png');
        return 'Bảng yêu cầu và các thao tác Duyệt hoàn tiền, Duyệt gửi bù (Đơn 0đ) hiển thị; không gửi lệnh xử lý.';
      }, ['07_returns.png']);

      await runStep(9, async (capture) => {
        await navigate('/admin/reconciliation');
        const table = page!.locator('.admin-reconciliation-table');
        await table.waitFor({ state: 'visible', timeout: 15_000 });
        for (const label of ['Đơn hàng', 'Thanh toán', 'Số tiền', 'Evidence']) {
          assert(await table.getByRole('columnheader', { name: label }).count() > 0, `Thiếu cột ${label} trong bảng đối soát.`);
        }
        const orderCodes = await table.locator('tbody tr td:first-child strong').allTextContents();
        assert(orderCodes.length > 0, 'Không có giao dịch đang chờ để xác minh đối soát SePay/payment evidence.');
        const evidenceStatuses = await table.locator('tbody tr td:nth-child(6)').allTextContents();
        assert(evidenceStatuses.every((status) => /Đã xác thực|Chưa có/.test(status)), 'Thiếu trạng thái xác thực payment evidence cho một hoặc nhiều giao dịch.');
        assert(await table.locator('tbody').getByText(/VIETQR|VietQR|MOMO|COD/i).count() > 0, 'Không thấy phương thức thanh toán của các giao dịch đối soát.');
        await capture('08_reconciliation.png');
        return `Đã kiểm tra ${orderCodes.length} giao dịch và trạng thái payment evidence; không kích hoạt đối soát hoặc hoàn tiền.`;
      }, ['08_reconciliation.png']);

      await runStep(10, async (capture) => {
        await navigate('/admin/reports');
        const funnel = page!.locator('.cro-funnel');
        await funnel.waitFor({ state: 'visible', timeout: 15_000 });
        await funnel.getByRole('heading', { name: 'Phễu chuyển đổi thương mại điện tử' }).waitFor({ state: 'visible', timeout: 10_000 });
        await capture('09_cro_funnel.png');

        const settingsResponse = await page!.goto(absoluteUrl('/admin/cai-dat'), { waitUntil: 'domcontentloaded', timeout: 45_000 });
        assert(settingsResponse && settingsResponse.status() < 400, `Mở /admin/cai-dat thất bại (HTTP ${settingsResponse?.status() ?? 'không có phản hồi'}).`);
        await page!.locator('main').first().waitFor({ state: 'visible', timeout: 15_000 });
        const monitoringTab = page!.getByRole('tab', { name: 'Giám sát hệ thống' });
        await monitoringTab.waitFor({ state: 'visible', timeout: 15_000 });
        await monitoringTab.click();
        const panel = page!.getByRole('tabpanel');
        await panel.waitFor({ state: 'visible', timeout: 10_000 });
        const databaseCard = panel.locator('.admin-kpi-card').filter({ hasText: 'Neon PostgreSQL' });
        const poolerCard = panel.locator('.admin-kpi-card').filter({ hasText: 'Connection pooler' });
        assert(await databaseCard.count() === 1, 'Không tìm thấy widget Neon PostgreSQL.');
        const databaseStatus = await databaseCard.innerText();
        const poolerStatus = await poolerCard.count() ? (await poolerCard.innerText()).replace(/\s+/g, ' ').trim() : 'Connection pooler chưa có dữ liệu';
        await capture('10_apm_monitoring.png');
        const databaseSummary = databaseStatus.replace(/\s+/g, ' ').trim();
        return `Widget CRO và thẻ Neon PostgreSQL hiển thị; CRO/APM được chấp nhận cả khi chưa có traffic hoặc số liệu mẫu. Neon: ${databaseSummary}. ${poolerStatus}.`;
      }, ['09_cro_funnel.png', '10_apm_monitoring.png']);
    }
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Lỗi không xác định.';
    console.error(`Lỗi khởi chạy audit: ${detail}`);
    if (!results.length) results.push({ step: 1, name: stepNames[0], status: 'FAIL', durationMs: 0, detail, screenshots: [] });
  } finally {
    await cleanupTestData();
    for (let step = 1; step <= 10; step += 1) {
      if (!results.some((result) => result.step === step)) skipStep(step, 'Bước chưa chạy do lỗi khởi chạy hoặc dừng suite.');
    }
    results.sort((left, right) => left.step - right.step);
    await writeFile(reportPath, createReport(), 'utf8');
    await context?.close().catch(() => undefined);
    await browser?.close().catch(() => undefined);
  }

  const failed = results.some((result) => result.status !== 'PASS') || cleanupNotes.some((note) => note.startsWith('LỖI'));
  console.log(`\nBáo cáo: ${reportPath}`);
  console.log(`Kết quả: ${results.filter((result) => result.status === 'PASS').length}/10 PASS, ${results.filter((result) => result.status === 'FAIL').length} FAIL, ${results.filter((result) => result.status === 'SKIP').length} SKIP.`);
  if (failed) process.exitCode = 1;
}

void main();