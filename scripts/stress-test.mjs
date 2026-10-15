#!/usr/bin/env node

const GREEN = '\u001b[32m';
const RED = '\u001b[31m';
const YELLOW = '\u001b[33m';
const RESET = '\u001b[0m';
const baseUrl = new URL(process.env.BASE_URL ?? 'http://localhost:3000');

function print(color, label, detail = '') {
  console.log(`${color}${label}${RESET} ${detail}`.trimEnd());
}

if (process.env.ALLOW_CHECKOUT_STRESS_TEST !== '1') {
  print(YELLOW, 'SAFETY', 'Script tạo đơn COD thật và giữ tồn kho. Đặt ALLOW_CHECKOUT_STRESS_TEST=1 để xác nhận chạy.');
  process.exit(2);
}
if (!['localhost', '127.0.0.1', '::1'].includes(baseUrl.hostname) && process.env.ALLOW_PRODUCTION_STRESS_TEST !== '1') {
  print(RED, 'BLOCKED', 'BASE_URL không phải localhost. Đặt ALLOW_PRODUCTION_STRESS_TEST=1 chỉ khi đã xác nhận môi trường test.');
  process.exit(2);
}

async function requestJson(path, { method = 'GET', body, cookie, idempotencyKey } = {}) {
  const headers = { accept: 'application/json' };
  if (body !== undefined) headers['content-type'] = 'application/json';
  if (cookie) headers.cookie = cookie;
  if (idempotencyKey) headers['idempotency-key'] = idempotencyKey;

  const response = await fetch(new URL(path, baseUrl), {
    method,
    headers,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    redirect: 'manual',
  });
  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }
  return { response, data };
}

function readCookie(response, name) {
  const setCookie = response.headers.get('set-cookie');
  const match = setCookie?.match(new RegExp(`(?:^|[,;]\\s*)${name}=([^;,]*)`));
  return match ? `${name}=${match[1]}` : null;
}

async function addBuyNowItem(product, cookie = '') {
  const variant = product.variants?.find((item) => item.stock > 0);
  const { response, data } = await requestJson('/api/cart/items', {
    method: 'POST',
    cookie,
    body: {
      productId: product.id,
      ...(variant ? { variantId: variant.id } : {}),
      quantity: 1,
      buyNow: true,
    },
  });
  if (!response.ok || !data?.item?.id) {
    throw new Error(`Không tạo được giỏ mua nhanh (${response.status}): ${data?.error?.message ?? 'API không trả item'}`);
  }
  const buyNowCookie = readCookie(response, 'bohoch_buy_now') ?? cookie;
  return {
    cookie: buyNowCookie,
    item: data.item,
    variant,
    price: variant?.price ?? product.price,
  };
}

function checkoutBody(product, cartItem, { hackedPrice = false } = {}) {
  return {
    customerName: 'Checkout Stress Test - COD',
    phone: '0762793244',
    address: 'Stress test COD - không giao hàng',
    paymentMethod: 'COD',
    buyNow: true,
    items: [{
      id: cartItem.item.id,
      productId: product.id,
      productSlug: product.slug,
      variantId: cartItem.variant?.id ?? null,
      quantity: 1,
      price: hackedPrice ? 1 : cartItem.price,
    }],
  };
}

async function main() {
  let failures = 0;
  const check = (passed, label, detail = '') => {
    print(passed ? GREEN : RED, passed ? 'PASS' : 'FAIL', `${label}${detail ? `: ${detail}` : ''}`);
    if (!passed) failures += 1;
  };

  try {
    const catalog = await requestJson('/api/products');
    if (!catalog.response.ok || !Array.isArray(catalog.data?.items)) {
      throw new Error(`Không tải được catalog (${catalog.response.status}). Hãy kiểm tra DATABASE_URL và migrations.`);
    }
    const product = catalog.data.items.find((item) => item.active !== false && item.stock > 0);
    if (!product) throw new Error('Catalog không có sản phẩm còn tồn để stress-test.');

    const cartItem = await addBuyNowItem(product);
    const hackCart = await addBuyNowItem(product);
    const idempotencyKey = `stress-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const first = await requestJson('/api/checkout', {
      method: 'POST',
      cookie: cartItem.cookie,
      idempotencyKey,
      body: checkoutBody(product, cartItem),
    });
    check(first.response.ok && first.data?.success === true && Boolean(first.data?.redirectUrl), 'Đơn hợp lệ', `HTTP ${first.response.status}${first.data?.orderCode ? ` · ${first.data.orderCode}` : ''}`);
    if (!first.response.ok || !first.data?.orderCode) {
      throw new Error(first.data?.error?.message ?? 'Không thể tiếp tục nếu bước tạo đơn hợp lệ thất bại.');
    }

    const concurrent = await Promise.all(Array.from({ length: 3 }, () => requestJson('/api/checkout', {
      method: 'POST',
      cookie: cartItem.cookie,
      idempotencyKey,
      body: checkoutBody(product, cartItem),
    })));
    const allSameOrder = concurrent.every(({ response, data }) => response.ok && data?.success === true && data?.orderCode === first.data.orderCode && Boolean(data?.redirectUrl));
    check(allSameOrder, 'Ba request đồng thời cùng idempotency key', allSameOrder ? `cùng trả ${first.data.orderCode}` : concurrent.map(({ response, data }) => `HTTP ${response.status}/${data?.orderCode ?? data?.error?.code ?? 'không có kết quả'}`).join(', '));

    const hacked = await requestJson('/api/checkout', {
      method: 'POST',
      cookie: hackCart.cookie,
      idempotencyKey: `stress-hack-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      body: checkoutBody(product, hackCart, { hackedPrice: true }),
    });
    check(hacked.response.status === 409 && hacked.data?.error?.code === 'PRICE_MISMATCH', 'Chặn request sửa giá', `HTTP ${hacked.response.status} · ${hacked.data?.error?.code ?? 'không có mã lỗi'}`);
  } catch (error) {
    failures += 1;
    print(RED, 'FAIL', error instanceof Error ? error.message : 'Stress test thất bại không rõ nguyên nhân.');
  }

  if (!failures) print(GREEN, 'DONE', 'Tất cả kiểm tra đều PASS. Script tạo một đơn COD stress-test và không thực hiện chuyển tiền.');
  else print(RED, 'DONE', `${failures} kiểm tra thất bại.`);
  process.exitCode = failures ? 1 : 0;
}

await main();
