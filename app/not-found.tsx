import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <main className="not-found-page">
      <section className="not-found-hero">
        <p className="not-found-kicker">MẮC KHÉN FARM · SƠN LA</p>
        <h1>404 - LẠC BƯỚC GIỮA ĐẠI NGÀN</h1>
        <p>Trang bạn đang tìm kiếm không tồn tại hoặc đã được chuyển dời sang nương rẫy khác.</p>
        <Link className="not-found-home-link" href="/"><ArrowLeft size={17} aria-hidden="true" /> Quay về bản làng (Trang chủ)</Link>
      </section>
    </main>
  );
}