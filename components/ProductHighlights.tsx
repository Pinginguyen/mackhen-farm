import React from 'react';

export default function ProductHighlights({ highlights }: { highlights?: string[] | null }) {
  return (
    <section className="product-reassurance-list !rounded-2xl !border !border-stone-200/80 !bg-white !p-5 shadow-xs" aria-label="Đặc điểm sản phẩm và cam kết cửa hàng">
      {highlights?.length ? (
        <div>
          <h2>Đặc điểm riêng của sản phẩm</h2>
          <ul>{highlights.map((item) => <li key={item}>{item}</li>)}</ul>
        </div>
      ) : null}
      <div>
        <h2>Cam kết chung của Shop</h2>
        <ul>
          <li>Đổi gói mới 0đ trong 24h nếu xì túi / hư hỏng bao bì, không cần trả hàng cũ</li>
          <li>Đóng gói tiêu chuẩn khử oxy, đảm bảo vệ sinh ATTP và giữ trọn hương vị Tây Bắc</li>
        </ul>
      </div>
    </section>
  );
}