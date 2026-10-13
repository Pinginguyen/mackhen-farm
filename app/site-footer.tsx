import Link from 'next/link';

export default function SiteFooter() {
  const supportPhone = process.env.NEXT_PUBLIC_SUPPORT_PHONE;
  const registeredWithMinistry = process.env.NEXT_PUBLIC_MOIT_REGISTERED === 'true';

  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div>
          <Link className="footer-brand" href="/">Mắc Khén Farm</Link>
          <p>Khô bò thực vật High-Protein chuẩn vị Tây Bắc.</p>
          <p>Hộ kinh doanh Mắc Khén Farm · Lai Châu, Việt Nam</p>
          <p>CSKH: {supportPhone || 'Liên hệ qua trang Tra cứu đơn hàng'}</p>
          <p>Chính sách bảo hành vị giác: đổi gói mới hoặc hoàn tiền trong 24 giờ nếu lỗi bao bì, ỉu mốc.</p>
          <p>Thông tin giấy chứng nhận cơ sở đủ điều kiện ATTP theo Nghị định 15/2018/NĐ-CP và hồ sơ tự công bố: liên hệ CSKH để xác minh.</p>
          {registeredWithMinistry && <p className="ministry-badge">Đã đăng ký với Bộ Công Thương</p>}
        </div>
        <nav aria-label="Liên kết cuối trang">
          <Link href="/products">Sản phẩm</Link>
          <Link href="/cart">Giỏ hàng</Link>
          <Link href="/account">Tài khoản</Link>
        </nav>
      </div>
    </footer>
  );
}