// @vitest-environment jsdom

import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { routerPush } = vi.hoisted(() => ({ routerPush: vi.fn() }));

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: routerPush }) }));

import PaymentStatusPoller from './payment-status-poller';

describe('PaymentStatusPoller', () => {
  beforeEach(() => {
    routerPush.mockReset();
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('redirects to the thank-you page as soon as polling detects PAID', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ paymentStatus: 'PAID' }) })
      .mockResolvedValue({ ok: true }));
    const container = document.createElement('div');
    const root = createRoot(container);

    await act(async () => {
      root.render(createElement(PaymentStatusPoller, {
        orderCode: 'MKF-123456',
        orderId: 'order-123',
        canPoll: true,
        children: createElement('p', null, 'QR'),
      }));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(routerPush).toHaveBeenCalledWith('/cam-on?orderCode=MKF-123456');

    await act(async () => root.unmount());
  });
});