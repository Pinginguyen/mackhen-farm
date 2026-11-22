'use client';

import { useState } from 'react';
import { Truck } from 'lucide-react';

type Shipment = {
  trackingCode: string;
  carrier: string;
  shippingStatus: string;
  labelUrl: string;
};

export default function CreateShipmentButton({
  orderId,
  carrier,
  trackingCode,
  labelUrl,
  onCreated,
}: {
  orderId: string;
  carrier: string | null;
  trackingCode: string | null;
  labelUrl: string | null;
  onCreated?: (shipment: Shipment) => void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState<Shipment | null>(null);
  const activeTrackingCode = created?.trackingCode ?? trackingCode;
  const activeLabelUrl = created?.labelUrl ?? labelUrl;

  async function createShipment() {
    setPending(true);
    setError('');
    try {
      const response = await fetch('/api/admin/orders/shipment', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ orderId, carrier: carrier ?? 'GHTK' }),
      });
      const result = await response.json() as { shipment?: Shipment; error?: { message?: string } };
      if (!response.ok || !result.shipment) {
        setError(result.error?.message ?? 'Không thể tạo vận đơn.');
        return;
      }
      setCreated(result.shipment);
      onCreated?.(result.shipment);
    } catch {
      setError('Không thể kết nối để tạo vận đơn.');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="admin-shipment-action flex flex-wrap items-center gap-3">
      {!activeTrackingCode && <>
        <button type="button" className="secondary-action" onClick={() => void createShipment()} disabled={pending || (carrier !== null && carrier !== 'GHTK' && carrier !== 'VIETTEL_POST')}>
          <Truck size={16} /> {pending ? 'Đang tạo...' : 'Tạo vận đơn bưu cục'}
        </button>
      </>}
      {activeTrackingCode && <span>Mã vận đơn: <strong>{activeTrackingCode}</strong></span>}
      {activeLabelUrl && <a className="secondary-action" href={activeLabelUrl} target="_blank" rel="noreferrer">In nhãn vận đơn</a>}
      {error && <span role="alert">{error}</span>}
    </div>
  );
}