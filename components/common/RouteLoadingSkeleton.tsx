type RouteLoadingKind = 'products' | 'cart' | 'checkout' | 'admin';

function SkeletonBlock({ className }: { className: string }) {
  return <span className={`route-skeleton-block ${className}`} />;
}

export default function RouteLoadingSkeleton({ kind }: { kind: RouteLoadingKind }) {
  const label = kind === 'admin' ? 'Đang tải bảng điều khiển' : kind === 'products' ? 'Đang tải sản phẩm' : kind === 'cart' ? 'Đang tải giỏ hàng' : 'Đang tải thanh toán';

  return (
    <main className={`page-shell route-loading-shell route-loading-${kind}`} aria-busy="true">
      <p className="sr-only" role="status">{label}</p>
      <div className="route-skeleton-content" aria-hidden="true">
        {kind === 'products' && <>
          <section className="route-skeleton-product-hero">
            <div><SkeletonBlock className="skeleton-kicker" /><SkeletonBlock className="skeleton-heading" /><SkeletonBlock className="skeleton-copy" /><SkeletonBlock className="skeleton-copy short" /></div>
            <SkeletonBlock className="skeleton-hero-image" />
          </section>
          <section className="route-skeleton-product-grid">
            {[0, 1, 2, 3].map((item) => <article key={item}><SkeletonBlock className="skeleton-product-image" /><SkeletonBlock className="skeleton-copy" /><SkeletonBlock className="skeleton-copy short" /><SkeletonBlock className="skeleton-button" /></article>)}
          </section>
        </>}
        {kind === 'cart' && <>
          <SkeletonBlock className="skeleton-heading" />
          <div className="route-skeleton-cart-layout">
            <section>{[0, 1, 2].map((item) => <div className="route-skeleton-cart-row" key={item}><SkeletonBlock className="skeleton-thumb" /><div><SkeletonBlock className="skeleton-copy" /><SkeletonBlock className="skeleton-copy short" /></div><SkeletonBlock className="skeleton-price" /></div>)}</section>
            <SkeletonBlock className="skeleton-order-summary" />
          </div>
        </>}
        {kind === 'checkout' && <>
          <SkeletonBlock className="skeleton-heading" />
          <div className="route-skeleton-checkout-layout">
            <section className="route-skeleton-form">{[0, 1, 2, 3, 4, 5].map((item) => <SkeletonBlock className="skeleton-field" key={item} />)}</section>
            <SkeletonBlock className="skeleton-order-summary" />
          </div>
        </>}
        {kind === 'admin' && <>
          <SkeletonBlock className="skeleton-heading" />
          <section className="route-skeleton-kpis">{[0, 1, 2, 3].map((item) => <SkeletonBlock className="skeleton-kpi" key={item} />)}</section>
          <SkeletonBlock className="skeleton-admin-panel" />
          <SkeletonBlock className="skeleton-admin-panel compact" />
        </>}
      </div>
    </main>
  );
}