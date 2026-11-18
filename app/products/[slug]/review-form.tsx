'use client';

import { useState } from 'react';
import ValidatedPhoneInput from '@/components/ValidatedPhoneInput';
import { useLocaleCurrency } from '@/lib/i18n-context';

export default function ReviewForm({ productId }: { productId: string }) {
  const { locale, currency } = useLocaleCurrency();
  const isEN = locale === 'en' || currency === 'SGD';
  const [message, setMessage] = useState('');
  const [rating, setRating] = useState(5);
  const [uploading, setUploading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');
    const form = new FormData(event.currentTarget);
    const files = form.getAll('images').filter((file): file is File => file instanceof File && file.size > 0);
    if (files.length > 5) {
      setMessage(isEN ? 'Upload up to 5 photos.' : 'Chỉ có thể tải lên tối đa 5 ảnh.');
      return;
    }
    setUploading(true);
    try {
      const images: string[] = [];
      for (const file of files) {
        const upload = new FormData();
        upload.set('orderCode', String(form.get('orderCode') ?? ''));
        upload.set('phone', String(form.get('phone') ?? ''));
        upload.set('productId', productId);
        upload.set('file', file);
        const uploadResponse = await fetch('/api/reviews/media', { method: 'POST', body: upload });
        const uploadResult = await uploadResponse.json() as { url?: string; error?: string };
        if (!uploadResponse.ok || !uploadResult.url) throw new Error(uploadResult.error ?? 'Không thể tải ảnh đánh giá.');
        images.push(uploadResult.url);
      }
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ productId, orderCode: form.get('orderCode'), phone: form.get('phone'), rating, comment: form.get('comment'), images }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) {
        setMessage(result.error ?? (isEN ? 'Could not submit your review.' : 'Không thể gửi đánh giá.'));
        return;
      }
      setMessage(isEN ? 'Thank you. Your review and photos are pending approval; the reward voucher will appear after approval.' : 'Cảm ơn bạn. Đánh giá và ảnh đang chờ duyệt; voucher tri ân sẽ được cấp sau khi duyệt.');
      event.currentTarget.reset();
      setRating(5);
    } catch {
      setMessage(isEN ? 'Connection failed. Please try again.' : 'Không thể kết nối. Vui lòng thử lại.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <form className="form-list review-form" onSubmit={submit}>
      <h3>{isEN ? 'Review a delivered order' : 'Đánh giá đơn hàng đã giao'}</h3>
      <div className="field">
        <label htmlFor="review-order">{isEN ? 'Order number' : 'Mã đơn hàng'}</label>
        <input id="review-order" name="orderCode" required />
      </div>
      <div className="field">
        <label htmlFor="review-phone">{isEN ? 'Order phone number' : 'Số điện thoại đặt hàng'}</label>
        <ValidatedPhoneInput id="review-phone" name="phone" required />
      </div>
      <div className="field">
          <label>{isEN ? 'Your rating' : 'Đánh giá của bạn'}</label>
        <div className="review-stars-picker" aria-label={isEN ? 'Select a star rating' : 'Chọn số sao đánh giá'}>
          {[5, 4, 3, 2, 1].map((value) => (
            <button
              key={value}
              type="button"
              className={rating === value ? 'is-selected' : ''}
              onClick={() => setRating(value)}
              aria-label={isEN ? `${value} stars` : `${value} sao`}
            >
              ★
            </button>
          ))}
        </div>
      </div>
      <div className="field">
        <label htmlFor="review-comment">{isEN ? 'Review' : 'Bình luận'}</label>
        <textarea id="review-comment" name="comment" minLength={3} maxLength={1000} required />
      </div>
      <div className="field"><label htmlFor="review-images">{isEN ? 'Real product photos (up to 5)' : 'Ảnh sản phẩm thực tế (tối đa 5 ảnh)'}</label><input id="review-images" name="images" type="file" accept="image/jpeg,image/png,image/webp" multiple /><small>{isEN ? 'JPG, PNG, or WEBP; max 5 MB each.' : 'JPG, PNG hoặc WEBP; tối đa 5 MB mỗi ảnh.'}</small></div>
      <button className="primary-action" type="submit" disabled={uploading}>{uploading ? (isEN ? 'Uploading...' : 'Đang tải ảnh...') : isEN ? 'Submit review' : 'Gửi đánh giá'}</button>
      {message && <p role="status">{message}</p>}
    </form>
  );
}