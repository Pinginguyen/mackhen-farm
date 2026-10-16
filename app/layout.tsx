import './globals.css';
import type { Metadata } from 'next';
import SiteFooter from './site-footer';
import FloatingContact from './floating-contact';
import Header from '@/components/layout/Header';
import SiteHeaderVisibility from '@/components/layout/SiteHeaderVisibility';
import SmoothScroll from '@/components/SmoothScroll';
import CartToast from '@/components/CartToast';
import ExitIntentPopup from '@/components/ExitIntentPopup';
import { Be_Vietnam_Pro } from 'next/font/google';

const beVietnamPro = Be_Vietnam_Pro({
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
  variable: '--font-be-vietnam-pro',
});

export const metadata: Metadata = {
  title: 'Mắc Khén Farm - Khô bò thực vật High-Protein chuẩn vị Tây Bắc',
  description: 'Dự án thực phẩm sinh thái Upcycled Food từ bã đậu nành. Dai ngon chuẩn vị thịt bò, giàu đạm, không cholesterol. Giao hàng toàn quốc.',
  openGraph: {
    type: 'website',
    locale: 'vi_VN',
    siteName: 'Mắc Khén Farm',
    title: 'Mắc Khén Farm - Khô bò thực vật High-Protein chuẩn vị Tây Bắc',
    description: 'Dự án thực phẩm sinh thái Upcycled Food từ bã đậu nành. Dai ngon chuẩn vị thịt bò, giàu đạm, không cholesterol. Giao hàng toàn quốc.',
    images: [{ url: '/products/xe-soi.jpg', alt: 'Mắc Khén Farm - Khô bò thực vật vị Tây Bắc' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Mắc Khén Farm - Khô bò thực vật High-Protein chuẩn vị Tây Bắc',
    description: 'Dự án thực phẩm sinh thái Upcycled Food từ bã đậu nành. Dai ngon chuẩn vị thịt bò, giàu đạm, không cholesterol. Giao hàng toàn quốc.',
    images: ['/products/xe-soi.jpg'],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body className={beVietnamPro.variable}>
        <SmoothScroll>
          <SiteHeaderVisibility><Header /></SiteHeaderVisibility>
          {children}
          <SiteFooter />
          <FloatingContact />
          <CartToast />
          <ExitIntentPopup />
        </SmoothScroll>
      </body>
    </html>
  );
}
