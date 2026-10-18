// @vitest-environment jsdom

import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

import AddToCart from './add-to-cart';

const baseProps = {
  productId: 'product-1',
  productSlug: 'product-1',
  name: 'Sản phẩm thử nghiệm',
  image: '/products/xe-soi.jpg',
  price: 65000,
  variants: [],
};

const variants = [
  { id: 'variant-150', label: 'Túi zip 150g', title: 'Túi zip 150g', price: 65000, originalPrice: 75000, weight: '150g', inventory: 20, stock: 20, status: 'Còn hàng' },
  { id: 'variant-300', label: 'Hũ thủy tinh 300g', title: 'Hũ thủy tinh 300g', price: 125000, originalPrice: null, weight: '300g', inventory: 10, stock: 10, status: 'Còn hàng' },
];

describe('AddToCart variants', () => {
  let root: Root;
  let container: HTMLDivElement;

  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false }));
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });

  it('shows the variant label and no dropdown for a single option', async () => {
    await act(async () => root.render(createElement(AddToCart, { ...baseProps, variants: [variants[0]] })));

    expect(container.querySelector('select')).toBeNull();
    expect(container.textContent).toContain('Quy cách: Túi zip 150g');
    expect(container.querySelector('.detail-prices strong')?.textContent).toBe('65.000đ');
  });

  it('updates the displayed price when a different variant is selected', async () => {
    await act(async () => root.render(createElement(AddToCart, { ...baseProps, variants })));
    const select = container.querySelector('select');
    expect(select).not.toBeNull();
    expect(container.querySelector('.detail-prices strong')?.textContent).toBe('65.000đ');

    await act(async () => {
      select!.value = 'variant-300';
      select!.dispatchEvent(new Event('change', { bubbles: true }));
    });

    expect(container.querySelector('.detail-prices strong')?.textContent).toBe('125.000đ');
  });
});