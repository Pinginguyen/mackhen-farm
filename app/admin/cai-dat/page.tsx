export const dynamic = 'force-dynamic';

export default function AdminSettingsPage() {
  const appUrl = process.env.APP_URL ?? 'Chưa cấu hình';
  const bank = process.env.VIETQR_BANK_ID ?? 'MB';

  return <main className="page-shell"><section className="page-card"><div className="page-title"><div><p className="eyebrow">Quản trị</p><h1>Cài đặt hệ thống</h1></div></div><div className="settings-list"><div><span>Thanh toán VietQR / SePay</span><strong>Đang dùng QR chuyển khoản trực tiếp · SePay tự động xác nhận</strong></div><div><span>Ngân hàng VietQR</span><strong>{bank}</strong></div><div><span>URL ứng dụng</span><strong>{appUrl}</strong></div></div><p className="settings-note">Thông tin nhạy cảm được quản lý qua biến môi trường và không hiển thị trong portal.</p></section></main>;
}