'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { useLocaleCurrency } from '@/lib/i18n-context';
import { translateContent } from '@/lib/translations';

type SearchProduct = { id: string; slug: string; name: string; category: string; price: number; originalPrice: number | null; stock: number; image: string };

function normalize(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLocaleLowerCase('vi');
}

export default function LiveProductSearch() {
  const { formatCurrency, translateProductName, locale } = useLocaleCurrency();
  const text = (value: string) => translateContent(value, locale);
  const [query, setQuery] = useState('');
  const [products, setProducts] = useState<SearchProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => {
    if (query.trim().length < 2) {
      setProducts([]);
      return;
    }
    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/products', { signal: controller.signal });
        if (!response.ok) throw new Error('Không thể tìm sản phẩm.');
        const result = await response.json() as { items: SearchProduct[] };
        const search = normalize(query.trim());
        setProducts(result.items.filter((product) => normalize(`${product.name} ${product.category}`).includes(search)).slice(0, 4));
      } catch {
        if (!controller.signal.aborted) setProducts([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 160);
    return () => { window.clearTimeout(timeout); controller.abort(); };
  }, [query]);

  const showResults = open && query.trim().length >= 2;

  return (
    <div className="live-product-search header-product-search relative !h-9 !min-h-0 !rounded-xl !border-stone-200/70 !bg-white/90 px-3 shadow-xs" ref={rootRef}>
      <Search size={17} aria-hidden="true" />
      <input className="placeholder:text-stone-400" aria-label={text('Tìm sản phẩm')} placeholder={text('Tìm chẳm chéo, mắc khén...')} value={query} onFocus={() => setOpen(true)} onChange={(event) => { setQuery(event.target.value); setOpen(true); }} onKeyDown={(event) => { if (event.key === 'Escape') setOpen(false); }} />
      {query && <button type="button" aria-label={text('Xóa tìm kiếm')} onClick={() => { setQuery(''); setOpen(true); }}><X size={15} /></button>}
      {showResults && <div className="live-search-dropdown absolute right-0 left-auto top-full mt-2 w-[360px] sm:w-[430px] max-w-[92vw] z-50 bg-white rounded-2xl border border-stone-200 shadow-xl overflow-hidden" role="listbox" aria-label={text('Gợi ý sản phẩm')}>
        {loading ? <p className="live-search-empty">{locale === 'en' ? 'Searching products...' : 'Đang tìm sản phẩm...'}</p> : products.length ? products.map((product) => <Link className="flex items-center gap-3 p-3 hover:bg-stone-50 transition border-b border-stone-200" role="option" href={`/products/${product.slug}`} key={product.id} onClick={() => setQuery('')}>
          <img className="w-12 h-12 shrink-0 rounded-lg object-cover" src={product.image} alt="" />
          <span className="flex-1 min-w-0">
            <strong className="block truncate font-semibold text-sm text-stone-900">{translateProductName(product.name)}</strong>
            <small className="block truncate text-xs text-stone-500">{text(product.category)} · {product.stock > 0 ? (locale === 'en' ? 'In stock' : 'Còn hàng') : (locale === 'en' ? 'Out of stock' : 'Tạm hết hàng')}</small>
          </span>
          <span className="shrink-0 text-right"><b className="font-bold text-sm text-[#841E1E] whitespace-nowrap">{formatCurrency(product.price)}</b></span>
        </Link>) : <p className="live-search-empty">{locale === 'en' ? 'No matching products found.' : 'Không tìm thấy sản phẩm phù hợp.'}</p>}
        <Link className="live-search-all-results" href={`/products?search=${encodeURIComponent(query.trim())}`} onClick={() => setOpen(false)}>{text('Xem tất cả kết quả cho')} “{query.trim()}”</Link>
      </div>}
    </div>
  );
}