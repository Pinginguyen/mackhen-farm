'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLocaleCurrency } from '@/lib/i18n-context';
import { translateContent } from '@/lib/translations';
import SoundEffect from '@/components/common/SoundEffect';
import type { PublicSystemSettings } from '@/lib/system-settings';

export default function SiteFooter({ settings }: { settings: PublicSystemSettings }) {
  const pathname = usePathname();
  const { locale } = useLocaleCurrency();
  const text = (value: string) => translateContent(value, locale);
  const companyName = settings.companyName || 'CÔNG TY CỔ PHẦN NÔNG SẢN SINH THÁI MẮC KHÉN FARM';
  const taxCode = settings.taxCode || '0110892644 do Sở KH&ĐT cấp ngày 15/01/2026';
  const representativeName = settings.representativeName || 'Trần Trung Châu';
  const address = settings.address || 'Bản Hua Tạt, Xã Vân Hồ, Tỉnh Sơn La';
  const hotline = settings.hotline || '0762.793.244';
  const email = settings.email || 'contact@mackhenfarm.vn';

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
          <p>{text('Hotline / Zalo đặt hàng:')} <a className="footer-zalo-link" href={`https://zalo.me/${hotline.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer">{hotline} {text('(Bấm chat Zalo)')}</a></p>
          <p>Email: <a href={`mailto:${email}`}>{email}</a></p>
          <p>{text('Địa chỉ điều hành: Chung cư M-One, Quận 7, TP. Hồ Chí Minh.')}</p>
          <p>{text('Hỗ trợ kỹ thuật & đổi trả: 8:00 - 22:00 hàng ngày.')}</p>
        </section>
        <nav className="site-footer-column" aria-label={text('Hỗ trợ khách hàng')}>
          <h2>{text('HỖ TRỢ & DỊCH VỤ')}</h2>
          <Link href="/tra-cuu">{text('Tra cứu hành trình đơn hàng')}</Link>
          <Link href="/tra-cuu#return-request-form">{text('Chính sách bảo hành vị giác (Đổi mới trong 24h)')}</Link>
          <Link href="/chinh-sach-bao-mat" className="hover:text-amber-300 transition-colors">{text('Chính sách bảo mật dữ liệu (Nghị định 13)')}</Link>
          <Link href="/products">{text('Danh mục sản phẩm khô bò & gia vị')}</Link>
          <Link className="footer-b2b-link" href="/hop-tac-b2b">{text('Hợp tác B2B (Wholesale)')}</Link>
          <Link className="footer-b2b-link" href="/truy-xuat">{text('Truy xuất nguồn gốc theo Lô')}</Link>
        </nav>
        <section className="site-footer-column footer-legal-column">
          <h2>{text('TIÊU CHUẨN & PHÁP LÝ')}</h2>
          <strong className="footer-legal-name">{companyName}</strong>
          <p className="leading-relaxed">Mã số thuế: {taxCode}</p>
          <p className="leading-relaxed">Người đại diện: {representativeName} · Trụ sở: {address}</p>
          <p className="leading-relaxed">Hotline: <a href={`tel:${hotline.replace(/[^\d+]/g, '')}`}>{hotline}</a> · Email: <a href={`mailto:${email}`}>{email}</a></p>
          <p className="leading-relaxed">{text('Công khai thông tin người bán theo Nghị định 52/2013/NĐ-CP và Nghị định 85/2021/NĐ-CP.')}</p>
          <p className="leading-relaxed">{text('Tuân thủ Nghị định 15/2018/NĐ-CP về hồ sơ tự công bố và an toàn thực phẩm.')}</p>
          <a
            href="http://online.gov.vn"
            target="_blank"
            rel="noreferrer noopener"
            // BỔ SUNG !no-underline và hover:!bg-blue-50/50 ở đây
            className="inline-flex items-center gap-2.5 bg-white border border-blue-200 px-3.5 py-2 rounded-xl shadow-sm hover:shadow-md transition-all group !no-underline hover:!bg-blue-50/50"
            title="Website đã thông báo với Bộ Công Thương"
          >
            <div className="w-7 h-7 flex-shrink-0 bg-blue-50 text-[#005BA6] rounded-lg flex items-center justify-center border border-blue-100">
              <svg className="w-4 h-4 text-[#005BA6]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <polyline points="9 12 11 14 15 10" />
              </svg>
            </div>
            <div className="flex flex-col text-left">
              {/* BỔ SUNG !no-underline và group-hover:!text-[#005BA6] ở đây */}
              <span className="text-[10px] uppercase tracking-wider font-extrabold text-[#005BA6] leading-tight !no-underline group-hover:!text-[#005BA6]">
                ĐÃ THÔNG BÁO
              </span>
              {/* BỔ SUNG !no-underline và group-hover:!text-red-600 ở đây */}
              <span className="text-[9px] uppercase tracking-tight font-bold text-red-600 leading-tight !no-underline group-hover:!text-red-600">
                BỘ CÔNG THƯƠNG
              </span>
            </div>
          </a>
        </section>
      </div>
      <div className="site-footer-bottom">{text('© 2026 Mắc Khén Farm. Dự án bài tập lớn Thương mại điện tử - ĐH Giao thông Vận tải (UTH).')}</div>
      <div className="site-footer-sound-control"><SoundEffect /></div>
    </footer>
  );
}