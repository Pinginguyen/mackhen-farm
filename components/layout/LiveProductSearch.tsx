'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { DEFAULT_PRODUCTS } from '@/lib/default-products';

type SearchProduct = { id: string; slug: string; name: string; category: string; price: number; originalPrice: number | null; stock: number; image: string };

function normalize(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLocaleLowerCase('vi');
}

export default function LiveProductSearch() {
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
        if (!controller.signal.aborted) {
          const search = normalize(query.trim());
          setProducts(DEFAULT_PRODUCTS.filter((product) => normalize(`${product.name} ${product.category}`).includes(search)).slice(0, 4));
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 160);
    return () => { window.clearTimeout(timeout); controller.abort(); };
  }, [query]);

  const showResults = open && query.trim().length >= 2;

  return (
    <div className="live-product-search" ref={rootRef}>
      <Search size={17} aria-hidden="true" />
      <input aria-label="Tìm sản phẩm" placeholder="Tìm chẳm chéo, mắc khén..." value={query} onFocus={() => setOpen(true)} onChange={(event) => { setQuery(event.target.value); setOpen(true); }} onKeyDown={(event) => { if (event.key === 'Escape') setOpen(false); }} />
      {query && <button type="button" aria-label="Xóa tìm kiếm" onClick={() => { setQuery(''); setOpen(true); }}><X size={15} /></button>}
      {showResults && <div className="live-search-dropdown" role="listbox" aria-label="Gợi ý sản phẩm">
        {loading ? <p className="live-search-empty">Đang tìm sản phẩm...</p> : products.length ? products.map((product) => <Link role="option" href={`/products/${product.slug}`} key={product.id} onClick={() => setQuery('')}><img src={product.image} alt="" /><span><strong>{product.name}</strong><small>{product.category}</small></span><span className="live-search-product-pricing"><span><b>{product.price.toLocaleString('vi-VN')}đ</b>{product.originalPrice != null && <del>{product.originalPrice.toLocaleString('vi-VN')}đ</del>}</span><small className={product.stock > 0 ? 'in-stock' : 'out-of-stock'}>{product.stock > 0 ? 'Còn hàng' : 'Tạm hết hàng'}</small></span></Link>) : <p className="live-search-empty">Không tìm thấy sản phẩm phù hợp.</p>}
        <Link className="live-search-all-results" href={`/products?search=${encodeURIComponent(query.trim())}`} onClick={() => setOpen(false)}>Xem tất cả kết quả cho “{query.trim()}”</Link>
      </div>}
    </div>
  );
}