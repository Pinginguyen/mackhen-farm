import B2bInquiryManager from './b2b-inquiry-manager';

export const dynamic = 'force-dynamic';

export default function AdminB2bPage() {
  return (
    <main className="page-shell admin-b2b-page">
      <section className="page-card">
        <div className="page-title">
          <div><p className="eyebrow">Đối tác &amp; phân phối</p><h1>Yêu cầu B2B</h1></div>
        </div>
        <B2bInquiryManager />
      </section>
    </main>
  );
}