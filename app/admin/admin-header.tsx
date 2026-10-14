'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ExternalLink, Search, UserRound, X } from 'lucide-react';

type SearchResult = { orderCode: string; customer: string; phone: string; status: string; total: number };

export default function AdminHeader({ name, email }: { name: string; email: string }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const value = query.trim();
    if (value.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/admin/orders?q=${encodeURIComponent(value)}`, { signal: controller.signal });
        if (!response.ok) throw new Error('Search failed');
        const result = await response.json() as { items: SearchResult[] };
        setResults(result.items.slice(0, 6));
      } catch {
        if (!controller.signal.aborted) setResults([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 250);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [query]);

  return (
    <header className="admin-header">
      <div className="admin-global-search">
        <Search size={18} aria-hidden="true" />
        <input
          aria-label="Tìm mã đơn, tên hoặc số điện thoại khách hàng"
          placeholder="Tìm mã đơn, tên hoặc SĐT khách hàng"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        {query && <button type="button" aria-label="Xóa tìm kiếm" onClick={() => setQuery('')}><X size={16} /></button>}
        {query.trim().length >= 2 && (
          <div className="admin-search-results" role="status">
            {loading ? <p>Đang tìm...</p> : results.length ? results.map((order) => (
              <Link href={`/admin/orders?search=${encodeURIComponent(order.orderCode)}`} key={order.orderCode} onClick={() => setQuery('')}>
                <span><strong>{order.orderCode}</strong><small>{order.customer} · {order.phone}</small></span>
                <b>{order.total.toLocaleString('vi-VN')}đ</b>
              </Link>
            )) : <p>Không tìm thấy đơn hàng phù hợp.</p>}
          </div>
        )}
      </div>
      <Link className="admin-store-link" href="/"><ExternalLink size={16} /> Xem cửa hàng</Link>
      <div className="admin-identity">
        <span className="admin-identity-icon"><UserRound size={17} /></span>
        <span><strong>{name}</strong><small>{email}</small></span>
      </div>
    </header>
  );
}