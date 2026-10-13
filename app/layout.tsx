import './globals.css';
import type { Metadata } from 'next';
import SiteFooter from './site-footer';
import FloatingContact from './floating-contact';

export const metadata: Metadata = {
  title: 'Mắc Khén Farm - Khô bò thực vật High-Protein vị Tây Bắc',
  description: 'Khô bò thực vật High-Protein chuẩn vị Tây Bắc, làm từ bã đậu nành theo mô hình Upcycled Food.',
  openGraph: {
    type: 'website',
    locale: 'vi_VN',
    siteName: 'Mắc Khén Farm',
    title: 'Mắc Khén Farm - Khô Bò Thực Vật High-Protein Vị Tây Bắc',
    description: 'Khô bò thực vật High-Protein chuẩn vị Tây Bắc, làm từ bã đậu nành địa phương theo mô hình kinh tế tuần hoàn Upcycled Food.',
    images: [{ url: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1200&h=630&q=85', width: 1200, height: 630, alt: 'Mắc Khén Farm - Khô bò thực vật vị Tây Bắc' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Mắc Khén Farm - Khô Bò Thực Vật High-Protein Vị Tây Bắc',
    description: 'Khô bò thực vật High-Protein từ bã đậu nành địa phương, đậm vị mắc khén và hạt dổi Tây Bắc.',
    images: ['https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1200&h=630&q=85'],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>
        {children}
        <SiteFooter />
        <FloatingContact />
      </body>
    </html>
  );
}
