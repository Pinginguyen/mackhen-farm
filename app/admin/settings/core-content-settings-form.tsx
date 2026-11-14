'use client';

import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import type { CoreContentSettings } from '@/lib/system-settings';

export default function CoreContentSettingsForm({ initialSettings, unavailable }: {
  initialSettings: CoreContentSettings;
  unavailable: boolean;
}) {
  const [settings, setSettings] = useState(initialSettings);
  const [saving, setSaving] = useState(false);

  function update<K extends keyof CoreContentSettings>(key: K, value: CoreContentSettings[K]) {
    setSettings((current) => ({ ...current, [key]: value }));
  }

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await fetch('/api/admin/content-settings', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const result = await response.json() as { settings?: CoreContentSettings; error?: string };
      if (!response.ok || !result.settings) throw new Error(result.error ?? 'Không thể lưu cài đặt.');
      setSettings(result.settings);
      toast.success('Đã lưu thay đổi');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể lưu cài đặt.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="settings-cro-form core-content-settings-form" onSubmit={saveSettings}>
      <div>
        <p className="eyebrow">NỘI DUNG STOREFRONT</p>
        <h2>Thông tin kinh doanh cốt lõi</h2>
      </div>
      {unavailable && <p className="empty-state" role="status">Không thể tải cài đặt từ cơ sở dữ liệu.</p>}
      <fieldset className="core-settings-group">
        <legend>Thông báo &amp; Chiến dịch</legend>
        <label className="field core-settings-enabled">
          <input type="checkbox" checked={settings.announcementBarEnabled} onChange={(event) => update('announcementBarEnabled', event.target.checked)} />
          Hiển thị thanh thông báo
        </label>
        <label className="field">Chữ chạy thông báo<input value={settings.announcementBarText} onChange={(event) => update('announcementBarText', event.target.value)} maxLength={300} required /></label>
        <label className="field">Tiêu đề banner khuyến mãi<input value={settings.homePromoTitle} onChange={(event) => update('homePromoTitle', event.target.value)} maxLength={200} required /></label>
        <label className="field">Mã voucher<input value={settings.homePromoVoucherCode} onChange={(event) => update('homePromoVoucherCode', event.target.value)} maxLength={80} required /></label>
      </fieldset>
      <fieldset className="core-settings-group">
        <legend>Thông tin liên hệ &amp; Pháp lý</legend>
        <label className="field">Tên doanh nghiệp / hộ kinh doanh<input value={settings.businessName} onChange={(event) => update('businessName', event.target.value)} maxLength={200} required /></label>
        <label className="field">Hotline<input type="tel" value={settings.contactHotline} onChange={(event) => update('contactHotline', event.target.value)} maxLength={40} required /></label>
        <label className="field">Số / Link Zalo<input value={settings.contactZalo} onChange={(event) => update('contactZalo', event.target.value)} maxLength={300} required /></label>
        <label className="field">Mã số thuế<input value={settings.businessTaxCode} onChange={(event) => update('businessTaxCode', event.target.value)} maxLength={200} required /></label>
        <label className="field">Link chứng nhận Bộ Công Thương<input type="url" value={settings.bctVerifiedUrl} onChange={(event) => update('bctVerifiedUrl', event.target.value)} maxLength={500} required /></label>
      </fieldset>
      <button className="primary-action" type="submit" disabled={saving || unavailable}>{saving ? 'Đang lưu...' : 'Lưu thay đổi'}</button>
    </form>
  );
}
