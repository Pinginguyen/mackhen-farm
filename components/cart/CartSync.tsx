'use client';

import { useEffect, useRef } from 'react';

const CHANNEL_NAME = 'mackhen-cross-tab-sync';
const STORAGE_EVENT_KEY = 'mackhen-cross-tab-event';
const LOCALE_CURRENCY_KEY = 'mackhen_locale_currency';

type SyncMessage =
  | { id: string; type: 'cart-updated' }
  | { id: string; type: 'locale-currency'; locale: 'vi' | 'en'; currency: 'VND' | 'SGD' };
type OutgoingSyncMessage =
  | { type: 'cart-updated' }
  | { type: 'locale-currency'; locale: 'vi' | 'en'; currency: 'VND' | 'SGD' };

function isSyncMessage(value: unknown): value is SyncMessage {
  if (typeof value !== 'object' || value === null || !('id' in value) || !('type' in value)) return false;
  const message = value as Partial<SyncMessage>;
  if (typeof message.id !== 'string') return false;
  if (message.type === 'cart-updated') return true;
  return message.type === 'locale-currency'
    && (message.locale === 'vi' || message.locale === 'en')
    && (message.currency === 'VND' || message.currency === 'SGD');
}

export default function CartSync() {
  const receivingRemoteMessage = useRef(false);

  useEffect(() => {
    const channel = typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel(CHANNEL_NAME);
    const seenIds = new Set<string>();

    const publish = (message: OutgoingSyncMessage) => {
      const fullMessage = { ...message, id: `${Date.now()}-${Math.random().toString(36).slice(2)}` } as SyncMessage;
      channel?.postMessage(fullMessage);
      try {
        window.localStorage.setItem(STORAGE_EVENT_KEY, JSON.stringify(fullMessage));
      } catch {
        // BroadcastChannel remains available when storage is disabled.
      }
    };

    const receive = (message: SyncMessage) => {
      if (seenIds.has(message.id)) return;
      seenIds.add(message.id);
      if (seenIds.size > 100) seenIds.delete(seenIds.values().next().value as string);

      receivingRemoteMessage.current = true;
      if (message.type === 'cart-updated') {
        window.dispatchEvent(new Event('bohoch:cart-updated'));
        window.dispatchEvent(new Event('mackhen:cart-sync'));
      } else {
        window.dispatchEvent(new CustomEvent('mackhen:locale-currency-sync', {
          detail: { locale: message.locale, currency: message.currency },
        }));
      }
      receivingRemoteMessage.current = false;
    };

    const onCartUpdated = () => {
      if (!receivingRemoteMessage.current) publish({ type: 'cart-updated' });
    };
    const onLocaleCurrencyChange = (event: Event) => {
      if (receivingRemoteMessage.current) return;
      const detail = (event as CustomEvent<{ locale?: unknown; currency?: unknown }>).detail;
      if ((detail?.locale === 'vi' || detail?.locale === 'en')
        && (detail.currency === 'VND' || detail.currency === 'SGD')) {
        publish({ type: 'locale-currency', locale: detail.locale, currency: detail.currency });
      }
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_EVENT_KEY && event.newValue) {
        try {
          const message: unknown = JSON.parse(event.newValue);
          if (isSyncMessage(message)) receive(message);
        } catch {
          return;
        }
      } else if (event.key === LOCALE_CURRENCY_KEY && event.newValue) {
        try {
          const preference = JSON.parse(event.newValue) as { locale?: unknown; currency?: unknown };
          if ((preference.locale === 'vi' || preference.locale === 'en')
            && (preference.currency === 'VND' || preference.currency === 'SGD')) {
            window.dispatchEvent(new CustomEvent('mackhen:locale-currency-sync', { detail: preference }));
          }
        } catch {
          return;
        }
      }
    };

    channel?.addEventListener('message', (event: MessageEvent<unknown>) => {
      if (isSyncMessage(event.data)) receive(event.data);
    });
    window.addEventListener('bohoch:cart-updated', onCartUpdated);
    window.addEventListener('mackhen:locale-currency-change', onLocaleCurrencyChange);
    window.addEventListener('storage', onStorage);
    return () => {
      channel?.close();
      window.removeEventListener('bohoch:cart-updated', onCartUpdated);
      window.removeEventListener('mackhen:locale-currency-change', onLocaleCurrencyChange);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  return null;
}