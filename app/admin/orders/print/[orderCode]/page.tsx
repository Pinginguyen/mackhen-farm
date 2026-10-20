import { notFound } from 'next/navigation';
import Image from 'next/image';

import { prisma } from '@/lib/prisma';
import PrintButton from '../../print-button';
import QRCode from 'qrcode';

export const dynamic = 'force-dynamic';

export default async function PackingSlipPage({ params }: { params: { orderCode: string } }) {
  const order = await prisma.order.findUnique({
    where: { orderCode: params.orderCode },
    include: { items: { include: { product: { select: { slug: true } } } } },
  });
  if (!order) notFound();
  const qrCode = await QRCode.toDataURL(order.trackingCode ?? order.orderCode, { width: 160, margin: 1, errorCorrectionLevel: 'M' });
  const amount = `${order.totalAmount.toLocaleString('vi-VN')}đ`;

  return (
    <main className="page-shell packing-slip-page">
      <style>{`
        .packing-slip-page { max-width: 900px; }
        .packing-slip-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 20px; }
        #printable-order { max-width: 760px; margin: 0 auto; padding: 32px; border: 2px solid #292a26; border-radius: 10px; background: #fff; color: #1c1917; }
        .packing-sheet-brand { display: flex; align-items: center; gap: 10px; color: #1e3f20; }
        .packing-sheet-brand-mark { display: grid; width: 38px; height: 38px; place-items: center; border: 2px solid #1e3f20; border-radius: 50%; font-weight: 800; }
        .packing-sheet-brand small, .packing-sheet-brand strong { display: block; }
        .packing-sheet-brand small { color: #57534e; font-size: 10px; }
        .packing-sheet-brand strong { font-size: 16px; }
        .packing-sheet-heading { display: flex; align-items: center; justify-content: space-between; gap: 20px; margin: 20px 0; padding: 16px 0; border-top: 2px solid #292a26; border-bottom: 1px solid #a8a29e; }
        .packing-sheet-heading h1 { margin: 0 0 5px; font-size: 22px; line-height: 1.2; }
        .packing-sheet-heading p { margin: 0; color: #57534e; font-size: 12px; }
        .packing-sheet-code { display: flex; align-items: center; gap: 12px; text-align: right; }
        .packing-sheet-code strong { display: block; font-size: 17px; overflow-wrap: anywhere; }
        .packing-sheet-code small { color: #57534e; font-size: 10px; }
        .packing-sheet-code img { width: 76px; height: 76px; object-fit: contain; }
        .packing-parties { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin-bottom: 20px; }
        .packing-party { min-width: 0; padding: 14px; border: 1px solid #a8a29e; border-radius: 6px; }
        .packing-party h2, .packing-picklist h2 { margin: 0 0 9px; font-size: 12px; text-transform: uppercase; }
        .packing-party p { margin: 4px 0; font-size: 12px; line-height: 1.5; overflow-wrap: anywhere; }
        .packing-party strong { font-size: 14px; }
        .packing-cod { margin: 0 0 20px; padding: 14px 16px; border: 2px solid #8b1e1e; border-radius: 6px; background: #fff8ed; color: #651a1a; font-size: 18px; font-weight: 800; text-align: center; }
        .packing-paid { margin: 0 0 20px; padding: 13px 16px; border: 2px solid #1e3f20; border-radius: 6px; color: #1e3f20; font-size: 16px; font-weight: 800; text-align: center; }
        .packing-pending-payment { margin: 0 0 20px; padding: 12px 14px; border: 1px solid #a8a29e; border-radius: 6px; font-size: 13px; font-weight: 700; text-align: center; }
        .packing-picklist { margin-bottom: 20px; }
        .packing-picklist table { width: 100%; border-collapse: collapse; table-layout: fixed; }
        .packing-picklist th, .packing-picklist td { padding: 9px 8px; border: 1px solid #78716c; font-size: 11px; text-align: left; overflow-wrap: anywhere; }
        .packing-picklist th { background: #f1f0eb; font-weight: 800; }
        .packing-picklist th:first-child, .packing-picklist td:first-child { width: 42px; text-align: center; }
        .packing-picklist th:last-child, .packing-picklist td:last-child { width: 64px; text-align: center; }
        .packing-sheet-footer { padding-top: 14px; border-top: 1px dashed #78716c; }
        .packing-sheet-footer p { margin: 5px 0; font-size: 11px; line-height: 1.5; }
        @media print {
          body * { visibility: hidden !important; }
          #printable-order, #printable-order * { visibility: visible !important; }
          #printable-order { position: absolute !important; left: 0 !important; top: 0 !important; width: 100% !important; max-width: none !important; margin: 0 !important; padding: 20px !important; border: 2px solid #292a26 !important; border-radius: 8px !important; background: white !important; }
          nav, aside, header, button, .no-print, .print-hide { display: none !important; }
          .packing-slip-page { max-width: none !important; margin: 0 !important; padding: 0 !important; }
          .packing-parties { grid-template-columns: 1fr 1fr !important; }
          .packing-cod, .packing-paid, .packing-pending-payment, .packing-party, .packing-picklist tr { break-inside: avoid; }
          @page { size: A4 portrait; margin: 10mm; }
        }
      `}</style>
      <div className="packing-slip-toolbar print-hide">
        <div><p className="eyebrow">Mắc Khén Farm</p><h1>Phiếu gửi hàng</h1></div>
        <PrintButton />
      </div>
      <section id="printable-order" aria-label={`Phiếu gửi hàng ${order.orderCode}`}>
        <div className="packing-sheet-brand">
          <span className="packing-sheet-brand-mark">M</span>
          <span><small>NÔNG SẢN SẤY VỊ TÂY BẮC</small><strong>MẮC KHÉN FARM</strong></span>
        </div>

        <div className="packing-sheet-heading">
          <div><h1>PHIẾU GỬI HÀNG &amp; NHẶT ĐƠN</h1><p>Ngày đặt: {order.createdAt.toLocaleString('vi-VN')}</p></div>
          <div className="packing-sheet-code">
            <div><small>MÃ ĐƠN / MÃ VẬN ĐƠN</small><strong>{order.orderCode}</strong><small>{order.trackingCode ?? 'Chưa có mã vận đơn'}</small></div>
            <Image src={qrCode} alt={`QR ${order.trackingCode ?? order.orderCode}`} width={160} height={160} sizes="76px" unoptimized />
          </div>
        </div>

        <div className="packing-parties">
          <section className="packing-party">
            <h2>Người gửi</h2>
            <p><strong>Mắc Khén Farm</strong></p>
            <p>Hotline: 0762.793.244</p>
            <p>Địa chỉ kho: Chung cư M-One, Quận 7, TP. Hồ Chí Minh.</p>
            <p>Đơn vị vận chuyển: {order.carrier ?? 'Chưa phân công'}</p>
          </section>
          <section className="packing-party">
            <h2>Người nhận</h2>
            <p><strong>{order.customerName}</strong></p>
            <p>Điện thoại: <strong>{order.phone}</strong></p>
            <p>Địa chỉ: {order.address}</p>
          </section>
        </div>

        {order.paymentMethod === 'COD' ? (
          <p className="packing-cod">TIỀN THU NGƯỜI NHẬN: {amount}</p>
        ) : order.paymentStatus === 'PAID' ? (
          <p className="packing-paid">ĐÃ THANH TOÁN (KHÔNG THU TIỀN)</p>
        ) : (
          <p className="packing-pending-payment">THANH TOÁN CHUYỂN KHOẢN · CHƯA XÁC NHẬN</p>
        )}

        <section className="packing-picklist">
          <h2>Bảng nhặt hàng · {order.items.length} sản phẩm</h2>
          <table>
            <thead><tr><th>STT</th><th>Tên sản phẩm</th><th>Phân loại</th><th>Số lượng</th></tr></thead>
            <tbody>{order.items.map((item, index) => (
              <tr key={item.id}><td>{index + 1}</td><td>{item.productName}</td><td>{item.variantLabel ?? '-'}</td><td>{item.quantity}</td></tr>
            ))}</tbody>
          </table>
        </section>

        <div className="packing-sheet-footer">
          <p><strong>LƯU Ý GIAO HÀNG:</strong> Cho khách xem hàng, đóng hộp carton 3 lớp khử oxy.</p>
          <p><strong>Ghi chú đơn hàng:</strong> {order.note || 'Không có'}</p>
          <p><strong>Mắc Khén Farm cảm ơn Quý khách!</strong></p>
        </div>
      </section>
    </main>
  );
}