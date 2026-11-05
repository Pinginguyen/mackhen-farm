'use client';

import { useState } from 'react';
import { Crown, Plus, Sparkles } from 'lucide-react';
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
    <section className="flavor-pairing-guide !gap-5 !rounded-3xl !border-[#d4a373]/40 !bg-[#142820] !p-5 !text-[#faf7f2] !shadow-[0_24px_55px_-30px_rgba(20,40,32,0.8)] sm:!p-7" style={{ backgroundImage: 'linear-gradient(135deg, #142820 0%, #263b30 100%)' }} aria-labelledby="flavor-pairing-title">
      <div className="flavor-pairing-heading"><span className="flavor-pairing-mark !h-11 !w-11 !flex-[0_0_44px] !rounded-2xl !border-[#d4a373]/50 !bg-[#d4a373]/10 !text-[#e7bd83]"><Crown size={19} aria-hidden="true" /></span><div><p className="eyebrow !text-[#e7bd83]">{isEN ? 'TASTE NOTES' : 'GỢI Ý THƯỞNG VỊ'}</p><h2 className="!text-[#faf7f2]" id="flavor-pairing-title">{isEN ? 'A Northwest pairing, your way' : 'Phối vị Tây Bắc theo gu của bạn'}</h2></div></div>
      <div className="flavor-pairing-tabs" role="group" aria-label={isEN ? 'Choose a pairing style' : 'Chọn gu thưởng thức'}>
        {(Object.keys(pairingGuides) as PairingTaste[]).map((taste) => <button key={taste} type="button" aria-pressed={selectedTaste === taste} className={`!min-h-11 !rounded-full !px-3 !text-xs !transition-all !duration-200 ${selectedTaste === taste ? '!border-[#d4a373] !bg-[#d4a373] !text-white !shadow-sm' : '!border-white/20 !bg-white/5 !text-[#f4ece0] hover:!border-[#d4a373]/70 hover:!bg-white/10'}`} onClick={() => { setSelectedTaste(taste); setMessage(''); }}>{isEN ? pairingGuides[taste].titleEn : pairingGuides[taste].titleVi}</button>)}
      </div>
      <p className="flavor-pairing-advice !m-0 !text-sm !leading-relaxed !text-[#ebe7dd]"><Sparkles className="!text-[#e7bd83]" size={17} aria-hidden="true" />{isEN ? guide.adviceEn : guide.adviceVi}</p>
      <div className="flavor-pairing-products">
        {recommendations.map((product) => <article className="!min-h-[82px] !rounded-2xl !border-white/10 !bg-white/[0.07] !p-3 !backdrop-blur-md" key={product.slug}><img className="!h-14 !w-14 !flex-[0_0_56px] !rounded-xl" src={product.image} alt="" width={56} height={56} /><span className="!gap-2"><strong className="!text-sm !leading-snug !text-[#faf7f2]">{translateProductName(product.name)}</strong><small className="!text-[#e7bd83]">{formatCurrency(product.price)}</small></span></article>)}
        {!recommendations.length && <p>{isEN ? 'Pairing products are currently unavailable.' : 'Các món gợi ý hiện đang tạm hết hàng.'}</p>}
      </div>
      <button className="flavor-pairing-add !inline-flex !min-h-12 !w-full !items-center !justify-center !gap-2 !rounded-2xl !border !border-[#e7bd83] !bg-[#d4a373] !px-5 !font-semibold !text-[#142820] !shadow-md !transition-all !duration-300 hover:!bg-[#e2b984] hover:!shadow-lg active:!scale-[0.98] disabled:!cursor-not-allowed disabled:!opacity-55 sm:!w-auto" type="button" onClick={() => void addPair()} disabled={!recommendations.length || pending}><Plus size={17} aria-hidden="true" />{pending ? (isEN ? 'Adding pair…' : 'Đang thêm cặp món…') : (isEN ? 'Add Pair to Cart' : 'Thêm cặp đôi vào giỏ')}</button>
      {message && <p className="flavor-pairing-message !text-[#dce8dc]" role="status">{message}</p>}
    </section>
  );
}