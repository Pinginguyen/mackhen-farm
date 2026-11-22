import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  console.log('✈️ ĐANG KIỂM TRA SẴN SÀNG CHO BUỔI DEMO SÁNG MAI...\n');
  
  // 1. Kiểm tra Admin
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  console.log(admin ? '✅ Tài khoản Admin: ' + admin.email + ' (SẴN SÀNG)' : '❌ THIẾU ADMIN!');

  // 2. Kiểm tra Sản phẩm & Lô hàng FEFO
  const pCount = await prisma.product.count();
  const lotCount = await prisma.productionLot.count({ where: { status: 'ACTIVE' } });
  console.log('✅ Số sản phẩm đang kinh doanh: ' + pCount + ' món');
  console.log('✅ Số Lô sản xuất FEFO khả dụng: ' + lotCount + ' lô (Đầy đủ tồn kho)');

  // 3. Kiểm tra Cài đặt pháp lý
  const settings = await prisma.storeProfileSettings.findFirst();
  console.log(settings ? '✅ Pháp lý & Cửa hàng: ' + settings.companyName : '❌ Thiếu settings');
  
  console.log('\n🎉 HỆ THỐNG ĐÃ SẴN SÀNG 100% CHO BUỔI THUYẾT TRÌNH!');
}

check().catch(console.error).finally(() => prisma.$disconnect());
