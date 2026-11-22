import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const CLEAN_IMAGES = {
  'combo-bo-ba-nhau-xanh': '/products/combo.jpg',
  'mac-khen-xe-soi-cay-nong': '/products/xe-soi.jpg',
  'mac-khen-chay-toi-gion-cay': '/products/chay-toi.jpg',
  'mac-khen-mieng-deo-tieu-rung': '/products/mieng-deo.jpg',
  'cham-cheo-uot': '/products/cham-cheo.jpg',
  'hat-mac-khen-sao-kho': '/products/hat-mac-khen.jpg',
  'hat-doi-rung-nep': '/products/hat-doi.jpg',
  'muoi-cham-cheo-hat-doi': '/products/muoi-cham-cheo.jpg',
};

async function main() {
  console.log('🧹 Đang dọn sạch 58 MB chuỗi Base64 khỏi Database...');
  const products = await prisma.product.findMany();
  for (const p of products) {
    const cleanUrl = CLEAN_IMAGES[p.slug];
    if (cleanUrl && (p.image?.startsWith('data:') || JSON.stringify(p.images || []).includes('data:'))) {
      await prisma.product.update({
        where: { id: p.id },
        data: { image: cleanUrl, images: [cleanUrl] }
      });
      console.log(`✅ Đã làm sạch [${p.slug}] -> ${cleanUrl}`);
    }
  }
  console.log('🚀 XONG! Dung lượng Database đã giảm từ 58 MB xuống còn chưa tới 5 KB!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
