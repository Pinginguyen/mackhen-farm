import AffiliateManager from './affiliate-manager';

export const dynamic = 'force-dynamic';

export default function AdminAffiliatesPage() {
  return (
    <main className="admin-affiliates-page">
      <header className="admin-affiliates-title">
        <div><p className="eyebrow">PARTNER MARKETING</p><h1>Đối tác KOC / Affiliate</h1><p>Quản lý cộng tác viên, doanh thu giới thiệu và quyết toán hoa hồng.</p></div>
      </header>
      <AffiliateManager />
    </main>
  );
}