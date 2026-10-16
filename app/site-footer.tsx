'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function SiteFooter() {
  const pathname = usePathname();
  if (pathname?.startsWith('/admin')) return null;

  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <section className="site-footer-column">
          <Link className="footer-brand" href="/">MẮC KHÉN FARM</Link>
          <p>Khô bò thực vật High-Protein chuẩn vị Tây Bắc. Tiên phong ứng dụng mô hình thực phẩm sinh thái (Upcycled Food) từ bã đậu nành địa phương.</p>
        </section>
        <section className="site-footer-column">
          <h2>LIÊN HỆ TRỰC TIẾP</h2>
          <p>Nhóm 3 <span>(Sáng lập &amp; Điều hành dự án)</span></p>
          <p>Hotline / Zalo đặt hàng: <a className="footer-zalo-link" href="https://zalo.me/0762793244" target="_blank" rel="noopener noreferrer">0762.793.244 (Bấm chat Zalo)</a></p>
          <p>Email: <a href="mailto:trungchau1210@gmail.com">trungchau1210@gmail.com</a></p>
          <p>Địa chỉ điều hành: Chung cư M-One, Quận 7, TP. Hồ Chí Minh.</p>
          <p>Hỗ trợ kỹ thuật &amp; đổi trả: 8:00 - 22:00 hàng ngày.</p>
        </section>
        <nav className="site-footer-column" aria-label="Hỗ trợ khách hàng">
          <h2>HỖ TRỢ &amp; DỊCH VỤ</h2>
          <Link href="/tra-cuu">Tra cứu hành trình đơn hàng</Link>
          <Link href="/tra-cuu#return-request-form">Chính sách bảo hành vị giác (Đổi mới trong 24h)</Link>
          <Link href="/products">Danh mục sản phẩm khô bò &amp; gia vị</Link>
          <Link href="/admin/returns">Cổng quản trị dành cho Admin</Link>
        </nav>
        <section className="site-footer-column">
          <h2>TIÊU CHUẨN &amp; PHÁP LÝ</h2>
          <p>Hộ kinh doanh Mắc Khén Farm - Tuân thủ Nghị định 15/2018/NĐ-CP về hồ sơ tự công bố và an toàn thực phẩm.</p>
          <p>Tuân thủ Điều 11 Luật Thương mại điện tử về minh bạch giao dịch và bảo vệ người tiêu dùng.</p>
        </section>
      </div>
      <div className="site-footer-bottom">© 2026 Mắc Khén Farm. Dự án bài tập lớn Thương mại điện tử - ĐH Giao thông Vận tải (UTH).</div>
    </footer>
  );
}