'use client';

import { useState } from 'react';
import { GlassWater, Plus, Sparkles } from 'lucide-react';
import { useLocaleCurrency } from '@/lib/i18n-context';

type PairingProduct = { id: string; slug: string; name: string; image: string; price: number; stock: number };
type PairingTaste = 'IPA' | 'RICE_WINE' | 'HEALTHY';

const pairingGuides: Record<PairingTaste, { titleVi: string; titleEn: string; icon: string; adviceVi: string; adviceEn: string; slugs: string[] }> = {
  IPA: {
    titleVi: 'Bia thủ công IPA 🍺', titleEn: 'Craft IPA 🍺', icon: '🍺',
    adviceVi: 'Vị cháy tỏi giòn cay đi cùng IPA mát lạnh tạo thế cân bằng giữa hương malt và mắc khén.',
    adviceEn: 'Crispy garlic heat meets a chilled IPA for a bright balance of malt and mac khen aroma.',
    slugs: ['mac-khen-chay-toi-gion-cay', 'mac-khen-xe-soi-cay-nong'],
  },
  RICE_WINE: {
    titleVi: 'Rượu nếp men lá 🍶', titleEn: 'Leaf-fermented rice wine 🍶', icon: '🍶',
    adviceVi: 'Combo ba vị cùng chẳm chéo ướt làm nổi bật hương thơm núi rừng và vị nếp men lá êm dịu.',
    adviceEn: 'A three-flavor jerky set with wet cham cheo brings out forest aromas beside mellow rice wine.',
    slugs: ['combo-bo-ba-nhau-xanh', 'cham-cheo-uot-chuan-vi-dien-bien'],
  },
  HEALTHY: {
    titleVi: 'Ăn vặt Healthy / Gym 💪', titleEn: 'Healthy / Gym snack 💪', icon: '💪',
    adviceVi: 'Khô xé sợi giàu đạm thực vật kết hợp hạt mắc khén rang thơm cho bữa phụ gọn nhẹ, đậm vị.',
    adviceEn: 'Protein-rich shredded plant jerky and aromatic mac khen make a compact, savory snack.',
    slugs: ['mac-khen-xe-soi-cay-nong', 'hat-mac-khen-rung-sao-kho-son-la'],
  },
};

export default function FlavorPairingGuide({ products }: { products: PairingProduct[] }) {
  const [selectedTaste, setSelectedTaste] = useState<PairingTaste>('IPA');
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const { currency, formatCurrency, translateProductName, locale } = useLocaleCurrency();
  const isEN = locale === 'en' || currency === 'SGD';
  const guide = pairingGuides[selectedTaste];
  const recommendations = guide.slugs
    .map((slug) => products.find((product) => product.slug === slug && product.stock > 0))
    .filter((product): product is PairingProduct => Boolean(product));

  async function addPair() {
    if (!recommendations.length || pending) return;
    setPending(true);
    setMessage('');
    let cartCount: number | undefined;
    let added = 0;
    try {
      for (const product of recommendations) {
        const response = await fetch('/api/cart/items', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ productId: product.slug, quantity: 1 }),
        });
        const result = await response.json() as { cartCount?: number; error?: { message?: string } };
        if (!response.ok) throw new Error(result.error?.message ?? (isEN ? 'Could not add the pairing.' : 'Không thể thêm cặp món.'));
        added += 1;
        cartCount = result.cartCount;
      }
      window.dispatchEvent(new CustomEvent('bohoch:cart-updated', { detail: { count: cartCount } }));
      window.dispatchEvent(new Event('mackhen:cart-drawer-open'));
      setMessage(isEN ? `${added} pairing items added.` : `Đã thêm ${added} món phối vị.`);
    } catch (error) {
      if (added) {
        window.dispatchEvent(new Event('bohoch:cart-updated'));
        window.dispatchEvent(new Event('mackhen:cart-drawer-open'));
      }
      setMessage(error instanceof Error ? error.message : (isEN ? 'Could not add the pairing.' : 'Không thể thêm cặp món.'));
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="flavor-pairing-guide" aria-labelledby="flavor-pairing-title">
      <div className="flavor-pairing-heading"><span className="flavor-pairing-mark"><GlassWater size={18} aria-hidden="true" /></span><div><p className="eyebrow">{isEN ? 'TASTE NOTES' : 'GỢI Ý THƯỞNG VỊ'}</p><h2 id="flavor-pairing-title">{isEN ? 'A Northwest pairing, your way' : 'Phối vị Tây Bắc theo gu của bạn'}</h2></div></div>
      <div className="flavor-pairing-tabs" role="group" aria-label={isEN ? 'Choose a pairing style' : 'Chọn gu thưởng thức'}>
        {(Object.keys(pairingGuides) as PairingTaste[]).map((taste) => <button key={taste} type="button" aria-pressed={selectedTaste === taste} className={selectedTaste === taste ? 'is-selected' : ''} onClick={() => { setSelectedTaste(taste); setMessage(''); }}>{isEN ? pairingGuides[taste].titleEn : pairingGuides[taste].titleVi}</button>)}
      </div>
      <p className="flavor-pairing-advice"><Sparkles size={16} aria-hidden="true" />{isEN ? guide.adviceEn : guide.adviceVi}</p>
      <div className="flavor-pairing-products">
        {recommendations.map((product) => <article key={product.slug}><img src={product.image} alt="" width={52} height={52} /><span><strong>{translateProductName(product.name)}</strong><small>{formatCurrency(product.price)}</small></span></article>)}
        {!recommendations.length && <p>{isEN ? 'Pairing products are currently unavailable.' : 'Các món gợi ý hiện đang tạm hết hàng.'}</p>}
      </div>
      <button className="flavor-pairing-add" type="button" onClick={() => void addPair()} disabled={!recommendations.length || pending}><Plus size={16} aria-hidden="true" />{pending ? (isEN ? 'Adding pair…' : 'Đang thêm cặp món…') : (isEN ? 'Add Pair to Cart' : 'Thêm cặp đôi vào giỏ')}</button>
      {message && <p className="flavor-pairing-message" role="status">{message}</p>}
    </section>
  );
}