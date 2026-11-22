import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('🔍 ĐANG ĐO DUNG LƯỢNG TỪNG SẢN PHẨM TRONG DATABASE...\n');
  const products = await prisma.product.findMany();
  for (const p of products) {
    const size = Buffer.byteLength(JSON.stringify(p), 'utf8');
    console.log(`- [${p.slug}]: ${(size / 1024).toFixed(1)} KB | image: ${p.image?.slice(0, 45)}...`);
    if (size > 50 * 1024) console.log('  ⚠️ CẢNH BÁO: Sản phẩm này nặng bất thường (dính ảnh Base64)!');
  }
  const assets = await prisma.siteAsset.findMany();
  for (const a of assets) {
    const size = Buffer.byteLength(JSON.stringify(a), 'utf8');
    if (size > 20 * 1024) console.log(`⚠️ Asset [${a.key}] quá nặng: ${(size / 1024).toFixed(1)} KB`);
  }
  console.log('\n✅ Đo xong!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
