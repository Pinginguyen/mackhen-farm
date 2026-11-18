# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 02_storefront_legal.spec.ts >> 08 SGD cents conversion and VND integer formatting preserve precision
- Location: tests\e2e\02_storefront_legal.spec.ts:262:5

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3000/san-pham
Call log:
  - navigating to "http://localhost:3000/san-pham", waiting until "domcontentloaded"

```

# Test source

```ts
  167 |       headers: { 'idempotency-key': `PW-VIETQR-${token()}` },
  168 |       data: {
  169 |         customer: { name: 'Playwright VietQR', phone: '0762793244', email: `pw-${token().toLowerCase()}@example.invalid` },
  170 |         delivery: { address: 'Local test address' }, paymentMethod: 'VIETQR', items: [{ id: cartItem.id, quantity: 1, price: product!.price }],
  171 |       },
  172 |     });
  173 |     expect([200, 201]).toContain(response.status());
  174 |     const result = await response.json() as { orderId: string; orderCode: string; totalAmount?: number; redirectUrl: string };
  175 |     order = await prisma.order.findUniqueOrThrow({ where: { id: result.orderId }, select: { id: true, orderCode: true, numericCode: true } });
  176 |     expect(result.orderCode).toMatch(/^MKF-\d{6}$/);
  177 |     expect(result.redirectUrl).toContain(`/checkout/vietqr/${result.orderCode}`);
  178 |     await page.goto(result.redirectUrl, { waitUntil: 'domcontentloaded' });
  179 |     await expect(page.getByRole('main')).toContainText(new RegExp(result.orderCode));
  180 |     await expect(page.getByRole('main')).toContainText(/MB|VietQR|QR/i);
  181 |     await expect(page.getByRole('main')).toContainText(/15:|14:|phút|minutes|countdown/i);
  182 |     const qrSource = await page.getByRole('img', { name: /VietQR/i }).getAttribute('src');
  183 |     expect(qrSource).toContain('/image/MB-');
  184 |   } finally {
  185 |     await cleanupOrder(order);
  186 |     await page.request.delete(absolute('/api/cart/items'), { data: { itemId: cartItem.id } }).catch(() => undefined);
  187 |   }
  188 | });
  189 | 
  190 | test('05 Verified five-star review waits for the localized status message, not an outdated toast', async ({ page }) => {
  191 |   test.skip(!adminPassword, 'Set AUDIT_ADMIN_PASSWORD to fulfill the review test order.');
  192 |   const product = (await productsFrom(page))[0];
  193 |   expect(product).toBeTruthy();
  194 |   const order = await purchaseAndDeliverReviewOrder(page, product!);
  195 |   try {
  196 |     await page.goto(`/products/${encodeURIComponent(product!.slug)}?review=1&orderCode=${order.orderCode}&phone=0762793244#product-reviews-title`, { waitUntil: 'domcontentloaded' });
  197 |     await expect(page.getByRole('heading', { name: /đánh giá sản phẩm|product review/i })).toBeVisible();
  198 |     await page.getByRole('textbox', { name: /họ và tên|full name/i }).fill('Playwright Verified Buyer');
  199 |     await page.getByRole('textbox', { name: /số điện thoại đặt hàng|order phone number/i }).fill('0762793244');
  200 |     await page.getByRole('textbox', { name: /mã đơn hàng|order number/i }).fill(order.orderCode);
  201 |     await page.getByRole('button', { name: /5 sao|5 stars/i }).click();
  202 |     await page.getByRole('textbox', { name: /bình luận|review/i }).fill(`Verified five-star E2E review ${token()}`);
  203 |     const createdReview = page.waitForResponse((response) => response.url().includes('/api/reviews') && response.request().method() === 'POST');
  204 |     await page.getByRole('button', { name: /gửi đánh giá|submit review/i }).click();
  205 |     expect((await createdReview).status()).toBe(201);
  206 |     await expect(page.getByRole('status').filter({ hasText: /cảm ơn bạn! đánh giá của bạn đã được thêm ngay lập tức|thank you! your review has been added/i })).toBeVisible({ timeout: 5_000 });
  207 |     const persisted = await prisma.review.findUnique({ where: { orderId_productId: { orderId: order.id, productId: product!.id } } });
  208 |     expect(persisted?.rating).toBe(5);
  209 |   } finally {
  210 |     await prisma.review.deleteMany({ where: { orderId: order.id } });
  211 |     await cleanupOrder(order);
  212 |   }
  213 | });
  214 | 
  215 | test('06 Order tracking page displays its SHA-256 integrity seal', async ({ page }) => {
  216 |   const product = (await productsFrom(page))[0];
  217 |   expect(product).toBeTruthy();
  218 |   const order = await createDeliveredReviewOrder(product!);
  219 |   try {
  220 |     await page.goto('/tra-cuu', { waitUntil: 'domcontentloaded' });
  221 |     await page.getByRole('textbox', { name: /mã đơn hàng/i }).fill(order.orderCode);
  222 |     await page.getByRole('textbox', { name: /số điện thoại/i }).fill('0762793244');
  223 |     await page.getByRole('button', { name: /tra cứu đơn hàng|track order/i }).click();
  224 |     const tracked = page.getByRole('article').filter({ hasText: order.orderCode });
  225 |     await expect(tracked).toBeVisible();
  226 |     await expect(tracked.getByRole('region', { name: /mã đối chiếu toàn vẹn sha-256/i })).toBeVisible();
  227 |     await expect(tracked).toContainText(order.orderCode);
  228 |   } finally {
  229 |     await prisma.review.deleteMany({ where: { orderId: order.id } });
  230 |     await prisma.order.deleteMany({ where: { id: order.id } });
  231 |   }
  232 | });
  233 | });
  234 | 
  235 | test('07 Traceability lookup exposes lot details and four supply-chain stages', async ({ page }) => {
  236 |   const batchCode = 'PW-BATCH-LEGAL-001';
  237 |   await page.route(`**/api/traceability/${batchCode}`, (route) => route.fulfill({
  238 |     status: 200,
  239 |     contentType: 'application/json',
  240 |     body: JSON.stringify({
  241 |       success: true,
  242 |       data: {
  243 |         batchCode,
  244 |         productName: 'Playwright Traceability Product',
  245 |         manufacturingDate: '01/11/2026',
  246 |         expiryDate: '01/11/2027',
  247 |         steps: Array.from({ length: 4 }, (_, index) => ({ label: `Stage ${index + 1}`, detail: `Fixture detail ${index + 1}` })),
  248 |       },
  249 |     }),
  250 |   }));
  251 |   await page.goto('/truy-xuat', { waitUntil: 'domcontentloaded' });
  252 |   await expect(page.getByRole('main')).toBeVisible();
  253 |   await page.waitForLoadState('networkidle');
  254 |   await page.getByPlaceholder(/nhập mã lô in trên bao bì/i).fill(batchCode);
  255 |   const traceabilityResponse = page.waitForResponse((response) => response.url().includes(`/api/traceability/${batchCode}`));
  256 |   await page.getByRole('button', { name: /^tra cứu$/i }).click();
  257 |   expect((await traceabilityResponse).status()).toBe(200);
  258 |   await expect(page.getByRole('main')).toContainText(batchCode);
  259 |   await expect(page.getByRole('listitem').filter({ hasText: /STAGE 0[1-4]|CÔNG ĐOẠN 0[1-4]/ })).toHaveCount(4);
  260 | });
  261 | 
  262 | test('08 SGD cents conversion and VND integer formatting preserve precision', async ({ page }) => {
  263 |   expect(convertVndToSgdCents(1_000_000, 18_500)).toBe(5_405);
  264 |   expect(formatSgdCents(5_405)).toBe('54.05');
  265 |   expect(convertVndToSgdCents(-1_000_000, 18_500)).toBe(-5_405);
  266 |   await page.addInitScript(() => localStorage.setItem('mackhen_locale_currency', JSON.stringify({ locale: 'en', currency: 'SGD' })));
> 267 |   await page.goto('/san-pham', { waitUntil: 'domcontentloaded' });
      |              ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3000/san-pham
  268 |   await expect(page.getByRole('main')).toContainText(/SGD|S\$/);
  269 |   await expect(page.getByRole('article').first()).toContainText(/SGD|S\$/);
  270 | });
  271 | 
  272 | test.describe('Local inquiry mutation', () => {
  273 |   test.skip(!mutationsAllowed, 'Requires a local DATABASE_URL and GOD_MODE_ALLOW_MUTATIONS=1.');
  274 | 
  275 | test('09 Singapore B2B inquiry form submits and confirms success', async ({ page }) => {
  276 |   await page.goto('/hop-tac-b2b', { waitUntil: 'domcontentloaded' });
  277 |   await page.getByRole('textbox', { name: /tên công ty/i }).fill(`PW Singapore ${token()}`);
  278 |   await page.getByRole('combobox', { name: /quốc gia/i }).selectOption('Singapore');
  279 |   await page.getByRole('textbox', { name: /người liên hệ/i }).fill('Playwright QA');
  280 |   await page.getByRole('textbox', { name: /điện thoại/i }).fill('+65 6123 4567');
  281 |   await page.getByRole('textbox', { name: 'Email' }).fill(`pw-${token().toLowerCase()}@example.invalid`);
  282 |   await page.getByRole('textbox', { name: /mức đặt hàng tối thiểu dự kiến/i }).fill('500 packs per month');
  283 |   let inquiryId = '';
  284 |   try {
  285 |     const submitted = page.waitForResponse((response) => response.url().includes('/api/b2b/inquiries') && response.request().method() === 'POST');
  286 |     await page.getByRole('button', { name: /gửi yêu cầu|submit/i }).click();
  287 |     const response = await submitted;
  288 |     expect([200, 201]).toContain(response.status());
  289 |     inquiryId = (await response.json() as { id: string }).id;
  290 |     await expect(page.getByRole('status')).toContainText(/yêu cầu đã được ghi nhận|request has been received/i);
  291 |   } finally {
  292 |     if (inquiryId) await prisma.b2bInquiry.deleteMany({ where: { id: inquiryId } });
  293 |   }
  294 | });
  295 | });
  296 | 
  297 | test('10 Privacy policy includes Decree 13 and required company contact disclosures', async ({ page }) => {
  298 |   await page.goto('/chinh-sach-bao-mat', { waitUntil: 'domcontentloaded' });
  299 |   await expect(page.getByRole('main')).toBeVisible();
  300 |   const content = await page.getByRole('main').innerText();
  301 |   expect(content).toMatch(/Nghị định 13|Decree 13|13\/2023\/NĐ-CP/i);
  302 |   expect(content).toMatch(/0762|hotline|contact@mackhenfarm.vn/i);
  303 |   expect(content).toContain('trungchau1210@gmail.com');
  304 |   expect(content).toMatch(/CÔNG TY|MẮC KHÉN FARM|Mack Khen Farm/i);
  305 | });
  306 | 
  307 | test('11 Public footer displays company disclosures and the Ministry of Industry and Trade notice', async ({ page }) => {
  308 |   await page.goto('/chinh-sach-bao-mat', { waitUntil: 'domcontentloaded' });
  309 |   const footer = page.getByRole('contentinfo');
  310 |   await expect(footer).toBeVisible();
  311 |   await expect(footer).toContainText(/CÔNG TY|MẮC KHÉN FARM/i);
  312 |   await expect(footer).toContainText(/Mã số thuế/i);
  313 |   await expect(footer).toContainText(/Người đại diện/i);
  314 |   await expect(footer.getByRole('link', { name: /đã thông báo bộ công thương/i })).toHaveAttribute('href', 'http://online.gov.vn');
  315 |   await expect(footer.getByRole('link', { name: /điều khoản dịch vụ/i })).toHaveAttribute('href', '/terms');
  316 | });
  317 | 
  318 | test('12 Terms of Service explains ordering, payments, returns, intellectual property, and complaints', async ({ page }) => {
  319 |   await page.goto('/terms', { waitUntil: 'domcontentloaded' });
  320 |   await expect(page.getByRole('heading', { name: /điều khoản dịch vụ/i, level: 1 })).toBeVisible();
  321 |   const terms = page.getByTestId('terms-content');
  322 |   await expect(terms).toContainText(/đặt hàng và xác nhận/i);
  323 |   await expect(terms).toContainText(/thanh toán và giao nhận/i);
  324 |   await expect(terms).toContainText(/nông sản tươi|nông sản khô/i);
  325 |   await expect(terms).toContainText(/quyền sở hữu trí tuệ/i);
  326 |   await expect(terms).toContainText(/khiếu nại và giải quyết tranh chấp/i);
  327 | });
  328 | 
  329 | test.afterAll(async () => { await prisma.$disconnect(); });
```