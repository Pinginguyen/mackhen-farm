'use client';

import { useLocaleCurrency } from '@/lib/i18n-context';

type ProductRatingProps = {
  rating: number;
  showValue?: boolean;
  className?: string;
  size?: 'sm' | 'md';
};

export default function ProductRating({ rating, showValue = true, className = '', size = 'md' }: ProductRatingProps) {
  const { locale } = useLocaleCurrency();
  const safeRating = Math.max(0, Math.min(5, Number(rating) || 0));
  const filledStars = Math.round(safeRating);
  const stars = Array.from({ length: 5 }, (_, index) => (index < filledStars ? '★' : '☆'));

  return (
    <div className={`product-rating ${size === 'sm' ? 'is-small' : ''} ${className}`.trim()} aria-label={locale === 'en' ? `Rated ${safeRating.toFixed(1)} out of 5 stars` : `Đánh giá ${safeRating.toFixed(1)} trên 5 sao`}>
      <span className="star-rating" aria-hidden="true">{stars.join('')}</span>
      {showValue && <span className="product-rating-value">{safeRating.toFixed(1)}</span>}
    </div>
  );
}
