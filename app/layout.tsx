import './globals.css';
import type { Metadata } from 'next';
import SiteFooter from './site-footer-server';
import FloatingContact from './floating-contact';
import Header from '@/components/layout/Header';
import SiteHeaderVisibility from '@/components/layout/SiteHeaderVisibility';
import SmoothScroll from '@/components/SmoothScroll';
import ExitIntentPopup from '@/components/ExitIntentPopup';
import { LocaleCurrencyProvider } from '@/lib/i18n-context';
import { Toaster } from 'sonner';
import { Be_Vietnam_Pro } from 'next/font/google';
import { Suspense } from 'react';
import AffiliateTracker from '@/components/marketing/AffiliateTracker';
import CartDrawer from '@/components/cart/CartDrawer';
import MobileBottomDock from '@/components/layout/MobileBottomDock';
import CookieConsent from '@/components/common/CookieConsent';
import CartSync from '@/components/cart/CartSync';
import { getSiteAsset } from '@/lib/site-assets';

const beVietnamPro = Be_Vietnam_Pro({
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
  variable: '--font-be-vietnam-pro',
});

const title = 'Mắc Khén Farm - Khô bò thực vật High-Protein chuẩn vị Tây Bắc';
const description = 'Dự án thực phẩm sinh thái Upcycled Food từ bã đậu nành. Dai ngon chuẩn vị thịt bò, giàu đạm, không cholesterol. Giao hàng toàn quốc.';

export async function generateMetadata(): Promise<Metadata> {
  const ogImageUrl = await getSiteAsset('OG_IMAGE', '/products/combo.jpg');
  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://mackhen-farm.vercel.app'),
    title,
    description,
    openGraph: { type: 'website', locale: 'vi_VN', siteName: 'Mắc Khén Farm', title, description, images: [{ url: ogImageUrl, alt: 'Mắc Khén Farm - Khô bò thực vật vị Tây Bắc' }] },
    twitter: { card: 'summary_large_image', title, description, images: [ogImageUrl] },
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [footerLogoUrl, bctBadgeUrl] = await Promise.all([
    getSiteAsset('LOGO_FOOTER', ''),
    getSiteAsset('BADGE_BCT', '/badge-bct.svg'),
  ]);

  return (
    <html lang="vi">
      <body className={beVietnamPro.className}>
        {/* Lenis cuộn mượt và Toaster thông báo */}
        <SmoothScroll />
        <Toaster position="top-right" richColors />

        {/* Khôi phục đầy đủ Header, Footer và Bộ đổi tiền */}
        <LocaleCurrencyProvider>
          <div className="texture-overlay" aria-hidden="true" />
          <div className="app-viewport overflow-x-clip">
            <Suspense fallback={null}><AffiliateTracker /></Suspense>
            <CartSync />
            <CookieConsent />
            <SiteHeaderVisibility>
              <Header />
            </SiteHeaderVisibility>
            {children}
            <SiteFooter footerLogoUrl={footerLogoUrl} bctBadgeUrl={bctBadgeUrl} />
            <FloatingContact />
            <ExitIntentPopup />
            <CartDrawer />
            <MobileBottomDock />
          </div>
        </LocaleCurrencyProvider>
      </body>
    </html>
  );
}