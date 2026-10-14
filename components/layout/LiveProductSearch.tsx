'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Search, X } from 'lucide-react';

type SearchProduct = { id: string; slug: string; name: string; category: string; price: number; image: string };

function normalize(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLocaleLowerCase('vi');
}

export default function LiveProductSearch() {
  const [query, setQuery] = useState('');
  const [products, setProducts] = useState<SearchProduct[]>([]);
  const [loading, setLoading] = useState(false);

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
        setProducts(result.items.filter((product) => normalize(`${product.name} ${product.category}`).includes(search)).slice(0, 5));
      } catch {
        if (!controller.signal.aborted) setProducts([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 160);
    return () => { window.clearTimeout(timeout); controller.abort(); };
  }, [query]);

  const showResults = query.trim().length >= 2;

  return (
    <div className="live-product-search">
      <Search size={17} aria-hidden="true" />
      <input aria-label="Tìm sản phẩm" placeholder="Tìm chẳm chéo, mắc khén..." value={query} onChange={(event) => setQuery(event.target.value)} />
      {query && <button type="button" aria-label="Xóa tìm kiếm" onClick={() => setQuery('')}><X size={15} /></button>}
      {showResults && <div className="live-search-dropdown" role="listbox" aria-label="Gợi ý sản phẩm">
        {loading ? <p className="live-search-empty">Đang tìm sản phẩm...</p> : products.length ? products.map((product) => <Link role="option" href={`/products/${product.slug}`} key={product.id} onClick={() => setQuery('')}><img src={product.image} alt="" /><span><strong>{product.name}</strong><small>{product.category}</small></span><b>{product.price.toLocaleString('vi-VN')}đ</b></Link>) : <p className="live-search-empty">Không tìm thấy sản phẩm phù hợp.</p>}
      </div>}
    </div>
  );
}