'use client';

import { useState } from 'react';
import { useLocaleCurrency } from '@/lib/i18n-context';
import { translateContent } from '@/lib/translations';

const productionSteps = [
  { title: 'Thu gom phụ phẩm', detail: 'Bã đậu nành địa phương được thu gom trong ngày.' },
  { title: 'Làm sạch & ép nước', detail: 'Nguyên liệu được sơ chế, khử trùng và ép đạt độ ẩm phù hợp.' },
  { title: 'Phối trộn gia vị', detail: 'Kết hợp mắc khén, hạt dổi, mật mía và gia vị Tây Bắc.' },
  { title: 'Tạo hình sản phẩm', detail: 'Tạo sợi hoặc miếng dẻo theo từng hương vị.' },
  { title: 'Sấy & kiểm tra', detail: 'Sấy ở nhiệt độ phù hợp, kiểm tra chất lượng trước khi đóng gói.' },
];

const packagingLayers = [
  { title: 'Túi nhôm 3 lớp', detail: 'Cản sáng, hạn chế ẩm và giữ hương vị.' },
  { title: 'Gói khử oxy', detail: 'Hỗ trợ bảo quản sản phẩm trong thời hạn sử dụng.' },
  { title: 'Hộp carton 3 lớp', detail: 'Giữ hộp chắc chắn, giảm móp méo khi vận chuyển.' },
  { title: 'Màng xốp bảo vệ', detail: 'Giảm va đập trên hành trình giao hàng.' },
];

export default function HomeTransparencyTabs() {
  const [activeTab, setActiveTab] = useState<'production' | 'packaging'>('production');
  const { locale } = useLocaleCurrency();
  const text = (value: string) => translateContent(value, locale);
  const steps = activeTab === 'production' ? productionSteps : packagingLayers;

  return (
    <section className="home-transparency-section" aria-labelledby="home-transparency-title">
      <div className="home-transparency-heading">
        <p className="eyebrow">{text('Quy trình & tiêu chuẩn')}</p>
        <h2 id="home-transparency-title">{text('Minh bạch từ khâu sản xuất đến tay người tiêu dùng')}</h2>
      </div>
      <div className="home-transparency-tabs" role="tablist" aria-label={text('Quy trình sản xuất và đóng gói')}>
        <button type="button" role="tab" aria-selected={activeTab === 'production'} className={activeTab === 'production' ? 'is-active' : ''} onClick={() => setActiveTab('production')}>
          {text('5 Bước sản xuất sinh thái')}
        </button>
        <button type="button" role="tab" aria-selected={activeTab === 'packaging'} className={activeTab === 'packaging' ? 'is-active' : ''} onClick={() => setActiveTab('packaging')}>
          {text('4 Lớp đóng gói tiêu chuẩn')}
        </button>
      </div>
      <ol className="home-transparency-steps" key={activeTab}>
        {steps.map((step, index) => (
          <li key={step.title} style={{ animationDelay: `${index * 70}ms` }}>
            <span>{String(index + 1).padStart(2, '0')}</span>
            <div><strong>{text(step.title)}</strong><p>{text(step.detail)}</p></div>
          </li>
        ))}
      </ol>
    </section>
  );
}