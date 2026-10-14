import './globals.css';
import type { Metadata } from 'next';
import SiteFooter from './site-footer';
import FloatingContact from './floating-contact';
import AiChatBox from '@/components/AiChatBox';
import SmoothScroll from '@/components/SmoothScroll';
import { Be_Vietnam_Pro } from 'next/font/google';

const beVietnamPro = Be_Vietnam_Pro({
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-be-vietnam-pro',
});

export const metadata: Metadata = {
  title: 'Mắc Khén Farm - Khô bò thực vật High-Protein vị Tây Bắc',
  description: 'Khô bò thực vật High-Protein chuẩn vị Tây Bắc, làm từ bã đậu nành theo mô hình Upcycled Food.',
  openGraph: {
    type: 'website',
    locale: 'vi_VN',
    siteName: 'Mắc Khén Farm',
    title: 'Mắc Khén Farm - Khô Bò Thực Vật High-Protein Vị Tây Bắc',
    description: 'Khô bò thực vật High-Protein chuẩn vị Tây Bắc, làm từ bã đậu nành địa phương theo mô hình kinh tế tuần hoàn Upcycled Food.',
    images: [{ url: '/products/xe-soi.jpg', alt: 'Mắc Khén Farm - Khô bò thực vật vị Tây Bắc' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Mắc Khén Farm - Khô Bò Thực Vật High-Protein Vị Tây Bắc',
    description: 'Khô bò thực vật High-Protein từ bã đậu nành địa phương, đậm vị mắc khén và hạt dổi Tây Bắc.',
    images: ['/products/xe-soi.jpg'],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body className={beVietnamPro.variable}>
        <SmoothScroll>
          {children}
          <SiteFooter />
          <FloatingContact />
          <AiChatBox />
        </SmoothScroll>
      </body>
    </html>
  );
}
