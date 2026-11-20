import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.svg', '.gif', '.ico']);

function scanDir(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      scanDir(fullPath, fileList);
    } else {
      const ext = path.extname(file).toLowerCase();
      if (IMAGE_EXTS.has(ext)) {
        fileList.push({
          relPath: fullPath.split(path.sep).join('/'),
          sizeKb: Math.round(stat.size / 1024),
          ext
        });
      }
    }
  }
  return fileList;
}

async function main() {
  console.log('🔍 ĐANG QUÉT TOÀN BỘ HÌNH ẢNH TRÊN HỆ THỐNG...\n');

  // 1. Quét file tĩnh trong public/
  const publicImages = scanDir('public');
  
  // 2. Quét cơ sở dữ liệu (SiteAsset & Product)
  let siteAssets = [];
  let products = [];
  try {
    siteAssets = await prisma.siteAsset.findMany();
    products = await prisma.product.findMany({
      select: { id: true, name: true, slug: true, image: true, images: true }
    });
  } catch (err) {
    console.warn('⚠️ Không thể đọc database, quét file tĩnh trước.');
  }

  // Tổng hợp báo cáo
  let report = `# BÁO CÁO TOÀN DIỆN VỀ HÌNH ẢNH (IMAGE AUDIT REPORT)\n`;
  report += `Tổng số ảnh tĩnh trong thư mục public: ${publicImages.length} file\n`;
  report += `Tổng số vị trí quản lý CMS (SiteAsset): ${siteAssets.length} slot\n`;
  report += `Tổng số ảnh sản phẩm trong Database: ${products.length} sản phẩm\n\n`;

  report += `## 1. DANH SÁCH ẢNH TRONG THƯ MỤC PUBLIC/ (${publicImages.length} ảnh)\n`;
  publicImages.forEach((img, i) => {
    report += `${i + 1}. ${img.relPath} (${img.sizeKb} KB)\n`;
  });

  report += `\n## 2. HIỆN TRẠNG CÁC VỊ TRÍ CMS (SITE_ASSETS TRANG ADMIN)\n`;
  if (siteAssets.length > 0) {
    siteAssets.forEach(asset => {
      report += `- [${asset.key}] ${asset.label}: ${asset.imageUrl || 'CHƯA CÓ ẢNH (ĐANG ĐỂ TRỐNG)'}\n`;
    });
  } else {
    report += `Chưa có bản ghi SiteAsset nào trong DB (đang dùng fallback file tĩnh).\n`;
  }

  report += `\n## 3. ẢNH ĐẠI DIỆN CÁC SẢN PHẨM (${products.length} sản phẩm)\n`;
  products.forEach(p => {
    report += `- [${p.name}]: ${p.image || 'Chưa có ảnh'} (Ảnh phụ: ${p.images?.length || 0})\n`;
  });

  fs.writeFileSync('IMAGE_AUDIT_REPORT.txt', report, 'utf8');
  
  console.log(`✅ QUÉT HOÀN TẤT!`);
  console.log(`- Thư mục public/: ${publicImages.length} ảnh`);
  console.log(`- Vị trí CMS quản trị: ${siteAssets.length} slot`);
  console.log(`- Sản phẩm bán trên web: ${products.length} món`);
  console.log(`📄 Toàn bộ danh sách chi tiết đã lưu vào file: IMAGE_AUDIT_REPORT.txt\n`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
