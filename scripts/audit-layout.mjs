import fs from 'fs';

function scanLayoutIssues(file) {
  if (!fs.existsSync(file)) return [];
  const content = fs.readFileSync(file, 'utf8');
  const issues = [];
  
  // 1. Kiểm tra tràn viền cứng
  if (content.match(/w-\[\d+px\]/)) issues.push('Dùng chiều rộng cứng (w-[...px]), nguy cơ vỡ responsive');
  if (content.match(/min-w-\[\d+px\]/)) issues.push('Dùng min-width cứng lớn, dễ gây tràn ngang mobile');
  
  // 2. Kiểm tra căn chỉnh mép container
  if (content.includes('max-w-') && !content.includes('mx-auto')) issues.push('Đặt max-w nhưng thiếu mx-auto để căn giữa');
  
  return issues;
}

const checkFiles = [
  'app/page.tsx',
  'components/layout/HeaderContent.tsx',
  'components/ProductCard.tsx',
  'components/layout/MobileBottomDock.tsx',
  'components/site-footer.tsx',
  'app/products/[slug]/page.tsx'
];

console.log('📐 ĐANG QUÉT CÁC ĐIỂM NGHẼN BỐ CỤC (LAYOUT AUDIT)...\n');
checkFiles.forEach(f => {
  const issues = scanLayoutIssues(f);
  console.log(`📁 ${f}:`);
  if (issues.length === 0) console.log('   ✅ Tương đối chuẩn mực');
  else issues.forEach(i => console.log(`   ⚠️  ${i}`));
});
console.log('\nQuét xong!');
