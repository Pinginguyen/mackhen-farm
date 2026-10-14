import { Suspense } from 'react';
import TrackingForm from './tracking-form';
import Header from '@/components/layout/Header';
import ReturnRequestForm from './return-request-form';
import { ArrowRight, Camera, MessageCircle, PackageCheck, ShieldCheck } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function TrackingPage() {
  const supportZaloUrl = process.env.NEXT_PUBLIC_SUPPORT_ZALO_URL;
  const steps = [
    {
      title: 'Chụp ảnh/Quay video',
      description: 'Ghi rõ mã vận đơn và tình trạng giao sai sản phẩm, túi bị xì hoặc rách.',
      icon: Camera,
    },
    {
      title: 'Gửi phản hồi',
      description: 'Liên hệ Zalo hỗ trợ trực tiếp hoặc điền form yêu cầu ngay bên dưới.',
      icon: MessageCircle,
    },
    {
      title: 'Nhận hàng bù trong 24h',
      description: 'Đổi gói mới 100% miễn phí hoặc hoàn tiền. Bạn không cần gửi trả gói cũ.',
      icon: PackageCheck,
    },
  ];

  return (
    <main className="page-shell return-page">
      <Header />
      <section className="page-card return-tracking-card">
        <p className="eyebrow">Theo dõi giao hàng</p>
        <h1>Đơn hàng của bạn đang ở đâu?</h1>
        <Suspense fallback={<p className="empty-state" role="status">Đang tải biểu mẫu tra cứu...</p>}>
          <TrackingForm />
        </Suspense>
      </section>

      <section className="return-policy" aria-labelledby="return-policy-title">
        <header className="return-policy-heading">
          <p className="eyebrow">Chính sách hỗ trợ khách hàng</p>
          <h2 id="return-policy-title">Chính sách &amp; Hướng dẫn Đổi trả - Hoàn tiền</h2>
          <p>Nếu đơn hàng giao sai hoặc sản phẩm gặp lỗi bao bì, ẩm mốc, Mắc Khén Farm sẽ hỗ trợ bạn nhanh chóng.</p>
        </header>

        <ol className="return-steps">
          {steps.map(({ title, description, icon: Icon }, index) => (
            <li key={title}>
              <span className="return-step-number">Bước {index + 1}</span>
              <span className="return-step-icon"><Icon size={22} /></span>
              <h3>{title}</h3>
              <p>{description}</p>
              {index < steps.length - 1 && <ArrowRight className="return-step-arrow" size={18} aria-hidden="true" />}
            </li>
          ))}
        </ol>

        <section className="return-form-panel" aria-labelledby="return-form-title">
          <header className="return-form-heading">
            <div>
              <p className="eyebrow">Chúng tôi sẵn sàng hỗ trợ</p>
              <h3 id="return-form-title">Gửi yêu cầu đổi trả nhanh</h3>
            </div>
            <a
              className="return-zalo-link"
              href={supportZaloUrl || '#return-request-form'}
              target={supportZaloUrl ? '_blank' : undefined}
              rel={supportZaloUrl ? 'noopener noreferrer' : undefined}
            >
              <MessageCircle size={18} />
              {supportZaloUrl ? 'Zalo hỗ trợ trực tiếp' : 'Điền form hỗ trợ'}
            </a>
          </header>
          <ReturnRequestForm />
        </section>

        <aside className="return-guarantee">
          <ShieldCheck size={26} aria-hidden="true" />
          <div>
            <strong>BẢO HÀNH VỊ GIÁC</strong>
            <p>Chúng tôi cam kết chịu 100% chi phí vận chuyển đơn gửi bù. Bạn không cần mang kiện hàng lỗi đi trả!</p>
          </div>
        </aside>
      </section>
    </main>
  );
}