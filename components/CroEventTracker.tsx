'use client';

import { useEffect, useRef } from 'react';

export type CroEventType = 'PRODUCT_VIEW' | 'ADD_TO_CART' | 'CHECKOUT_START';

function getSessionId(): string {
  const key = 'mackhen_cro_session';
  const existing = window.sessionStorage.getItem(key);
  if (existing) return existing;

  const sessionId = window.crypto.randomUUID();
  window.sessionStorage.setItem(key, sessionId);
  return sessionId;
}

export function recordCroEvent(eventType: CroEventType, productId?: string): void {
  if (typeof window === 'undefined') return;
  try {
    const body = JSON.stringify({ eventType, sessionId: getSessionId(), productId });
    void fetch('/api/analytics/funnel', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    return;
  }
}

export default function CroEventTracker({ eventType, productId }: { eventType: CroEventType; productId?: string }) {
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    recordCroEvent(eventType, productId);
  }, [eventType, productId]);

  return null;
}