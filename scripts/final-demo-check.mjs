import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const BASE = 'https://mackhen-farm.vercel.app';

async function main() {
  console.log('🚀 ĐANG QUÉT TOÀN BỘ HỆ THỐNG TRƯỚC BUỔI DEMO...\n');

  // 1. Kiểm tra Database
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  console.log(admin ? `✅ [DB] Tài khoản Admin: ${admin.email}` : '❌ [DB] Thiếu tài khoản Admin!');

  const products = await prisma.product.findMany();
  const heavy = products.filter(p => Buffer.byteLength(JSON.stringify(p), 'utf8') > 50 * 1024);
  console.log(`✅ [DB] Sản phẩm: ${products.length} món | Dữ liệu nặng (Base64): ${heavy.length === 0 ? '0 (Sạch đẹp, siêu nhẹ!)' : heavy.length + ' món ⚠️ (Hãy chạy lại clean-base64.mjs!)'}`);

  const lots = await prisma.productionLot.count({ where: { status: 'ACTIVE', expDate: { gt: new Date() }, availableQty: { gt: 0 } } });
  console.log(`✅ [DB] Lô hàng FEFO khả dụng: ${lots} lô`);

  // 2. Bắn thử từng trang trên Web thật
  console.log('\n🌐 ĐANG KIỂM TRA TỐC ĐỘ & TRẠNG THÁI TRÊN WEB THẬT...');
  const routes = ['/', '/products', '/products/cham-cheo-uot', '/cart', '/checkout', '/tra-cuu', '/truy-xuat', '/hop-tac-b2b', '/dang-nhap', '/api/health'];
  for (const route of routes) {
    const start = Date.now();
    try {
      const res = await fetch(BASE + route);
      const ms = Date.now() - start;
      console.log(`${res.ok ? '✅' : '❌'} [HTTP ${res.status}] ${route.padEnd(28)} (${ms}ms)`);
    } catch (err) {
      console.log(`❌ [LỖI MẠNG] ${route}:`, err.message);
    }
  }
  console.log('\n🎉 KIỂM TRA HOÀN TẤT!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
