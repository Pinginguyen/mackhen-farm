import fs from 'fs';

function inspectRoute(filePath, name) {
  if (!fs.existsSync(filePath)) return `// Không tìm thấy ${filePath}\n`;
  const code = fs.readFileSync(filePath, 'utf8');
  return `\n=== LUỒNG TỪ FILE: ${name} (${filePath}) ===\n` + code;
}

const report = [
  "# TÀI LIỆU TRÍCH XUẤT LUỒNG THỰC TẾ (CODE-BASED FLOW EXTRACTION)",
  "Dùng để đối chiếu và vẽ chuẩn Activity / Sequence Diagram.\n",
  inspectRoute('app/api/cart/items/route.ts', 'Thêm vào giỏ hàng'),
  inspectRoute('app/api/orders/route.ts', 'Tạo đơn hàng & Phân bổ FEFO'),
  inspectRoute('app/api/payment/sepay/webhook/route.ts', 'Webhook SePay đối soát'),
  inspectRoute('app/checkout/vietqr/[orderCode]/payment-status-poller.tsx', 'Poller trạng thái VietQR')
].join('\n');

fs.writeFileSync('CODE_FLOW_EXACT.txt', report, 'utf8');
console.log('✅ ĐÃ QUÉT XONG! File chi tiết lưu tại: CODE_FLOW_EXACT.txt');
