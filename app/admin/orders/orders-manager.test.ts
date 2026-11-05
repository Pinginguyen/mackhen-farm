import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import OrdersManager from './orders-manager';

const order = {
  id: 'order-1',
  orderCode: 'MKF-123456',
  customer: 'Nguyễn An',
  phone: '0762793244',
  address: 'Sơn La',
  status: 'PENDING',
  paymentMethod: 'COD',
  paymentStatus: 'PENDING',
  total: 169000,
  subtotal: 134000,
  affiliateCode: null,
  shippingFee: 35000,
  discountAmount: 0,
  note: null,
  trackingCode: null,
  carrier: null,
  createdAt: '2026-11-05T00:00:00.000Z',
  items: [{ productName: 'Hạt mắc khén', sku: 'hat-mac-khen', quantity: 1 }],
};

describe('Admin order status controls', () => {
  it('keeps order workflow and payment states in separate dropdowns', () => {
    const html = renderToStaticMarkup(createElement(OrdersManager, { orders: [order] }));
    const orderStatusSelect = html.match(/<select name="status"[\s\S]*?<\/select>/)?.[0] ?? '';
    const paymentStatusSelect = html.match(/<select name="paymentStatus"[\s\S]*?<\/select>/)?.[0] ?? '';

    expect(orderStatusSelect).toContain('Chờ xác nhận');
    expect(orderStatusSelect).not.toContain('value="PAID"');
    expect(orderStatusSelect).not.toContain('Đã thanh toán');
    expect(orderStatusSelect).toContain('value="CANCELLED"');
    expect(orderStatusSelect).not.toContain('disabled=""');
    expect(orderStatusSelect).toContain('Giữ nguyên (Không đổi)');
    expect((orderStatusSelect.match(/Đang giao hàng/g) ?? [])).toHaveLength(0);

    expect(paymentStatusSelect).toContain('value="PENDING"');
    expect(paymentStatusSelect).toContain('value="PAID"');
    expect(paymentStatusSelect).toContain('value="REFUNDED"');
    expect(paymentStatusSelect).toContain('Đã hoàn tiền');

    const deliveryHtml = renderToStaticMarkup(createElement(OrdersManager, {
      orders: [{ ...order, status: 'PROCESSING' }],
    }));
    const processingStatusSelect = deliveryHtml.match(/<select name="status"[\s\S]*?<\/select>/)?.[0] ?? '';
    expect(processingStatusSelect).toContain('value="HANDED_OFF"');
    expect(processingStatusSelect).toContain('Đã bàn giao 3PL');

    const handedOffHtml = renderToStaticMarkup(createElement(OrdersManager, {
      orders: [{ ...order, status: 'HANDED_OFF' }],
    }));
    const deliveryStatusSelect = handedOffHtml.match(/<select name="status"[\s\S]*?<\/select>/)?.[0] ?? '';
    expect(deliveryStatusSelect).toContain('value="SHIPPING"');
    expect(deliveryStatusSelect).toContain('value="RETURNED"');
    expect(deliveryStatusSelect).toContain('Đang giao hàng');
    expect(deliveryStatusSelect).not.toContain('value="IN_TRANSIT"');
    expect((deliveryStatusSelect.match(/Đang giao hàng/g) ?? [])).toHaveLength(1);
    expect(deliveryStatusSelect).toContain('Hoàn hàng');

    const shippingHtml = renderToStaticMarkup(createElement(OrdersManager, {
      orders: [{ ...order, status: 'SHIPPING' }],
    }));
    const shippingStatusSelect = shippingHtml.match(/<select name="status"[\s\S]*?<\/select>/)?.[0] ?? '';
    expect(shippingStatusSelect).toContain('value="DELIVERED"');
    expect(shippingStatusSelect).toContain('value="RETURNED"');

    const deliveredHtml = renderToStaticMarkup(createElement(OrdersManager, {
      orders: [{ ...order, status: 'DELIVERED' }],
    }));
    const deliveredStatusSelect = deliveredHtml.match(/<select name="status"[\s\S]*?<\/select>/)?.[0] ?? '';
    expect(deliveredStatusSelect).toContain('value="COMPLETED"');
  });

  it('keeps a legacy PAID order status without exposing it as an order option', () => {
    const html = renderToStaticMarkup(createElement(OrdersManager, {
      orders: [{ ...order, status: 'PAID', paymentStatus: 'PAID' }],
    }));
    const orderStatusSelect = html.match(/<select name="status"[\s\S]*?<\/select>/)?.[0] ?? '';

    expect(orderStatusSelect).toContain('Giữ nguyên (Không đổi): Chờ xử lý');
    expect(orderStatusSelect).not.toContain('value="PAID"');
    expect(orderStatusSelect).not.toContain('Đã thanh toán');
  });
});
