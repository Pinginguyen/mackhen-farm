# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 02_storefront_legal.spec.ts >> 01 Hydration Guardian reports no React 418, 423, or 425 on storefront routes
- Location: tests\e2e\02_storefront_legal.spec.ts:106:5

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3000/
Call log:
  - navigating to "http://localhost:3000/", waiting until "domcontentloaded"

```

# Test source

```ts
  15  |   try { return ['localhost', '127.0.0.1', '::1'].includes(new URL(process.env.DATABASE_URL || '').hostname); }
  16  |   catch { return false; }
  17  | })();
  18  | const mutationsAllowed = ['localhost', '127.0.0.1', '::1'].includes(base.hostname)
  19  |   && process.env.GOD_MODE_ALLOW_MUTATIONS === '1'
  20  |   && databaseIsLocal;
  21  | 
  22  | test.use({ baseURL });
  23  | test.setTimeout(60_000);
  24  | 
  25  | type Product = { id: string; slug: string; name: string; category: string; price: number; stock?: number };
  26  | type CreatedOrder = { id: string; orderCode: string; numericCode: number };
  27  | 
  28  | function token(): string { return randomBytes(6).toString('hex').toUpperCase(); }
  29  | function absolute(path: string): string { return new URL(path, baseURL).toString(); }
  30  | 
  31  | async function productsFrom(page: Page): Promise<Product[]> {
  32  |   const response = await page.request.get(absolute('/api/products'));
  33  |   expect(response.status()).toBe(200);
  34  |   const payload: unknown = await response.json();
  35  |   const rows = Array.isArray(payload) ? payload : (payload as { items?: Product[] }).items ?? [];
  36  |   return rows as Product[];
  37  | }
  38  | 
  39  | async function addItem(page: Page, product: Product, quantity = 1): Promise<{ id: string; quantity: number; price: number }> {
  40  |   const response = await page.request.post(absolute('/api/cart/items'), { data: { productId: product.id, quantity } });
  41  |   expect(response.status()).toBe(200);
  42  |   const result = await response.json() as { item: { id: string; quantity: number }; totals: { subtotal: number } };
  43  |   return { ...result.item, price: product.price };
  44  | }
  45  | 
  46  | async function cleanupOrder(order: CreatedOrder | undefined): Promise<void> {
  47  |   if (!order) return;
  48  |   await prisma.$transaction(async (tx) => {
  49  |     const owner = await tx.order.findUnique({ where: { id: order.id }, select: { customerId: true } });
  50  |     const items = await tx.orderItem.findMany({ where: { orderId: order.id }, select: { productId: true, productVariantId: true, quantity: true, lotId: true } });
  51  |     for (const item of items) {
  52  |       await tx.product.update({ where: { id: item.productId }, data: { stock: { increment: item.quantity } } });
  53  |       if (item.productVariantId) await tx.productVariant.update({ where: { id: item.productVariantId }, data: { inventory: { increment: item.quantity } } });
  54  |       if (item.lotId) await tx.productionLot.updateMany({ where: { id: item.lotId }, data: { availableQty: { increment: item.quantity } } });
  55  |     }
  56  |     await tx.order.delete({ where: { id: order.id } });
  57  |     if (owner?.customerId) await tx.customer.deleteMany({ where: { id: owner.customerId, orders: { none: {} } } });
  58  |   });
  59  | }
  60  | 
  61  | async function createDeliveredReviewOrder(product: Product): Promise<CreatedOrder> {
  62  |   const code = Math.floor(100000 + Math.random() * 900000);
  63  |   return prisma.order.create({
  64  |     data: {
  65  |       orderCode: `MKF-${code}`, customerName: `Review QA ${token()}`, phone: '0762793244', address: 'Local review fixture',
  66  |       orderStatus: 'DELIVERED', paymentMethod: 'COD', paymentStatus: 'PAID', subtotal: product.price, shippingFee: 0,
  67  |       totalAmount: product.price, items: { create: [{ productId: product.id, productName: product.name, titleSnapshot: product.name, variantNameSnapshot: '', skuSnapshot: product.slug, quantity: 1, unitPrice: product.price, discountAllocated: 0, finalPrice: product.price, lineTotal: product.price }] },
  68  |     },
  69  |     select: { id: true, orderCode: true, numericCode: true },
  70  |   });
  71  | }
  72  | 
  73  | async function purchaseAndDeliverReviewOrder(page: Page, product: Product): Promise<CreatedOrder> {
  74  |   expect(adminPassword, 'Set AUDIT_ADMIN_PASSWORD to fulfill the review test order.').not.toBe('');
  75  |   const cartResponse = await page.request.post(absolute('/api/cart/items'), { data: { productId: product.id, quantity: 1 } });
  76  |   expect(cartResponse.status()).toBe(200);
  77  |   const cartItem = (await cartResponse.json() as { item: { id: string } }).item;
  78  |   const checkout = await page.request.post(absolute('/api/orders'), {
  79  |     headers: { 'idempotency-key': `PW-REVIEW-${token()}` },
  80  |     data: {
  81  |       customer: { name: 'Playwright Verified Buyer', phone: '0762793244', email: `pw-review-${token().toLowerCase()}@example.invalid` },
  82  |       delivery: { address: 'Local verified review test' }, paymentMethod: 'COD',
  83  |       items: [{ id: cartItem.id, quantity: 1, price: product.price }],
  84  |     },
  85  |   });
  86  |   expect([200, 201]).toContain(checkout.status());
  87  |   const result = await checkout.json() as { orderId: string };
  88  |   const order = await prisma.order.findUniqueOrThrow({ where: { id: result.orderId }, select: { id: true, orderCode: true, numericCode: true } });
  89  |   const login = await page.request.post(absolute('/api/auth/login'), { data: { email: adminEmail, password: adminPassword } });
  90  |   expect(login.ok(), `Admin login returned HTTP ${login.status()}`).toBeTruthy();
  91  |   const transitions: Array<{ status: string; carrier?: string; trackingCode?: string }> = [
  92  |     { status: 'CONFIRMED' },
  93  |     { status: 'PROCESSING' },
  94  |     { status: 'HANDED_OFF', carrier: 'SPX', trackingCode: `PW${token()}` },
  95  |     { status: 'SHIPPING', carrier: 'SPX', trackingCode: `PW${token()}` },
  96  |     { status: 'DELIVERED' },
  97  |   ];
  98  |   for (const transition of transitions) {
  99  |     const response = await page.request.patch(absolute('/api/admin/orders'), { data: { orderCode: order.orderCode, ...transition } });
  100 |     expect(response.status(), `Failed order transition to ${transition.status}`).toBe(200);
  101 |   }
  102 |   await page.request.delete(absolute('/api/cart/items'), { data: { itemId: cartItem.id } }).catch(() => undefined);
  103 |   return order;
  104 | }
  105 | 
  106 | test('01 Hydration Guardian reports no React 418, 423, or 425 on storefront routes', async ({ page }) => {
  107 |   const hydrationErrors: string[] = [];
  108 |   page.on('console', (message) => {
  109 |     if (message.type() === 'error' && /Minified React error #(?:418|423|425)/i.test(message.text())) hydrationErrors.push(message.text());
  110 |   });
  111 |   page.on('pageerror', (error) => {
  112 |     if (/Minified React error #(?:418|423|425)/i.test(error.message)) hydrationErrors.push(error.message);
  113 |   });
  114 |   for (const path of ['/', '/san-pham', '/chinh-sach-bao-mat']) {
> 115 |     const response = await page.goto(path, { waitUntil: 'domcontentloaded' });
      |                                 ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3000/
  116 |     expect(response?.status(), `Failed to load ${path}`).toBeLessThan(400);
  117 |     await expect(page.getByRole('main')).toBeVisible();
  118 |   }
  119 |   expect(hydrationErrors, hydrationErrors.join('\n')).toEqual([]);
  120 | });
  121 | 
  122 | test('02 Catalog search and dynamic category filters narrow the product list', async ({ page }) => {
  123 |   await page.goto('/san-pham', { waitUntil: 'domcontentloaded' });
  124 |   await expect(page.getByRole('main')).toBeVisible();
  125 |   const search = page.getByRole('textbox', { name: /tìm trong danh mục/i });
  126 |   await expect(search).toBeVisible();
  127 |   const productCards = page.getByRole('article');
  128 |   const initialCount = await productCards.count();
  129 |   expect(initialCount).toBeGreaterThan(0);
  130 |   await page.getByRole('tab', { name: /gia vị|spice/i }).click();
  131 |   const spiceProducts = (await productsFrom(page)).filter((product) => product.category === 'Gia vị Tây Bắc');
  132 |   expect(spiceProducts.length).toBeGreaterThan(0);
  133 |   await search.fill('no-such-product-playwright');
  134 |   await expect(productCards).toHaveCount(0);
  135 |   await search.fill(spiceProducts[0].name);
  136 |   await expect(productCards).toHaveCount(1);
  137 | });
  138 | 
  139 | test.describe('Local database mutations', () => {
  140 |   test.skip(!mutationsAllowed, 'Requires a local DATABASE_URL and GOD_MODE_ALLOW_MUTATIONS=1.');
  141 | 
  142 | test('03 Cart shipping and free-shipping threshold are calculated by server APIs', async ({ page }) => {
  143 |   const products = await productsFrom(page);
  144 |   const product = products.find((item) => item.stock === undefined || item.stock > 0);
  145 |   expect(product).toBeTruthy();
  146 |   const added = await addItem(page, product!);
  147 |   try {
  148 |     const cart = await page.request.get(absolute('/api/cart'));
  149 |     expect(cart.status()).toBe(200);
  150 |     const data = await cart.json() as { subtotal: number; shipping: number; total: number; freeShippingThreshold: number };
  151 |     expect(data.subtotal).toBe(product!.price);
  152 |     expect(data.total).toBe(data.subtotal + data.shipping);
  153 |     expect(Number.isSafeInteger(data.freeShippingThreshold)).toBe(true);
  154 |     expect(data.shipping).toBeGreaterThanOrEqual(0);
  155 |   } finally {
  156 |     await page.request.delete(absolute('/api/cart/items'), { data: { itemId: added.id } });
  157 |   }
  158 | });
  159 | 
  160 | test('04 VietQR checkout creates an MB Bank QR page with amount and expiry countdown', async ({ page }) => {
  161 |   const product = (await productsFrom(page)).find((item) => item.stock === undefined || item.stock > 0);
  162 |   expect(product).toBeTruthy();
  163 |   const cartItem = await addItem(page, product!);
  164 |   let order: CreatedOrder | undefined;
  165 |   try {
  166 |     const response = await page.request.post(absolute('/api/orders'), {
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
```