import ReturnRequestsManager from './return-requests-manager';

export default function AdminReturnsPage() {
  return (
    <main className="page-shell admin-returns-page">
      <section className="admin-return-section">
        <div className="page-title">
          <div>
            <p className="eyebrow">Chăm sóc khách hàng</p>
            <h1>Yêu cầu đổi trả</h1>
          </div>
        </div>
        <ReturnRequestsManager />
      </section>
    </main>
  );
}