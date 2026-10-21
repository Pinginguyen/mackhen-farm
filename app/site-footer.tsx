'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLocaleCurrency } from '@/lib/i18n-context';
import { translateContent } from '@/lib/translations';

export default function SiteFooter() {
  const pathname = usePathname();
  const { locale } = useLocaleCurrency();
  const text = (value: string) => translateContent(value, locale);
  if (pathname?.startsWith('/admin')) return null;

  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <section className="site-footer-column">
          <Link className="footer-brand" href="/">MẮC KHÉN FARM</Link>
          <p>{text('Khô bò thực vật High-Protein chuẩn vị Tây Bắc. Tiên phong ứng dụng mô hình thực phẩm sinh thái (Upcycled Food) từ bã đậu nành địa phương.')}</p>
        </section>
        <section className="site-footer-column">
          <h2>{text('LIÊN HỆ TRỰC TIẾP')}</h2>
          <p>{text('Nhóm 3')} <span>{text('(Sáng lập & Điều hành dự án)')}</span></p>
          <p>{text('Hotline / Zalo đặt hàng:')} <a className="footer-zalo-link" href="https://zalo.me/0762793244" target="_blank" rel="noopener noreferrer">0762.793.244 {text('(Bấm chat Zalo)')}</a></p>
          <p>Email: <a href="mailto:trungchau1210@gmail.com">trungchau1210@gmail.com</a></p>
          <p>{text('Địa chỉ điều hành: Chung cư M-One, Quận 7, TP. Hồ Chí Minh.')}</p>
          <p>{text('Hỗ trợ kỹ thuật & đổi trả: 8:00 - 22:00 hàng ngày.')}</p>
        </section>
        <nav className="site-footer-column" aria-label={text('Hỗ trợ khách hàng')}>
          <h2>{text('HỖ TRỢ & DỊCH VỤ')}</h2>
          <Link href="/tra-cuu">{text('Tra cứu hành trình đơn hàng')}</Link>
          <Link href="/tra-cuu#return-request-form">{text('Chính sách bảo hành vị giác (Đổi mới trong 24h)')}</Link>
          <Link href="/products">{text('Danh mục sản phẩm khô bò & gia vị')}</Link>
          <Link className="footer-b2b-link" href="/hop-tac-b2b">{text('Hợp tác B2B (Wholesale)')}</Link>
          <Link className="footer-b2b-link" href="/truy-xuat">{text('Truy xuất nguồn gốc theo Lô')}</Link>
        </nav>
        <section className="site-footer-column">
          <h2>{text('TIÊU CHUẨN & PHÁP LÝ')}</h2>
          <p>{text('Hộ kinh doanh Mắc Khén Farm - Tuân thủ Nghị định 15/2018/NĐ-CP về hồ sơ tự công bố và an toàn thực phẩm.')}</p>
          <p>{text('Tuân thủ Điều 11 Luật Thương mại điện tử về minh bạch giao dịch và bảo vệ người tiêu dùng.')}</p>
        </section>
      </div>
      <div className="site-footer-bottom">{text('© 2026 Mắc Khén Farm. Dự án bài tập lớn Thương mại điện tử - ĐH Giao thông Vận tải (UTH).')}</div>
    </footer>
  );
}