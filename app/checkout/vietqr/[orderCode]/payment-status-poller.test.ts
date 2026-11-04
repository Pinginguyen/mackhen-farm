// @vitest-environment jsdom

import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { routerPush } = vi.hoisted(() => ({ routerPush: vi.fn() }));

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: routerPush }) }));
vi.mock('@/lib/payment-celebration', () => ({ celebratePayment: vi.fn() }));

import PaymentStatusPoller from './payment-status-poller';
import { celebratePayment } from '@/lib/payment-celebration';

describe('PaymentStatusPoller', () => {
  beforeEach(() => {
    routerPush.mockReset();
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('stops polling after 15 minutes', async () => {
    vi.useFakeTimers();
    const intervalId = 123 as unknown as ReturnType<typeof window.setInterval>;
    const setIntervalSpy = vi.spyOn(window, 'setInterval').mockReturnValue(intervalId);
    const clearIntervalSpy = vi.spyOn(window, 'clearInterval');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
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
    });

    expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 2000);
    await act(async () => {
      vi.advanceTimersByTime(15 * 60 * 1000);
      await Promise.resolve();
    });
    expect(clearIntervalSpy).toHaveBeenCalledWith(intervalId);

    await act(async () => root.unmount());
  });

  it.each(['PAID', 'SUCCESS'])('celebrates and redirects when polling detects %s', async (status) => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ paymentStatus: status }) })
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
  expect(celebratePayment).toHaveBeenCalledWith('MKF-123456');

    await act(async () => root.unmount());
  });
});