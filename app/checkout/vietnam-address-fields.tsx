'use client';

import { useState } from 'react';

import { vietnamAddresses } from '@/lib/vietnam-addresses';

function splitAddress(value = '') {
  const parts = value.split(',').map((part) => part.trim()).filter(Boolean);
  const province = parts[0] in vietnamAddresses ? parts[0] : '';
  const districts = province ? vietnamAddresses[province] : undefined;
  const district = parts[1] && districts?.[parts[1]] ? parts[1] : '';
  const ward = parts[2] && district && districts?.[district]?.includes(parts[2]) ? parts[2] : '';
  const streetAddress = ward ? parts.slice(3).join(', ') : parts.slice(province ? 1 : 0).join(', ');
  return { province, district, ward, streetAddress };
}

export default function VietnamAddressFields({ initialAddress = '' }: { initialAddress?: string }) {
  const [initial] = useState(() => splitAddress(initialAddress));
  const [province, setProvince] = useState(initial.province);
  const [district, setDistrict] = useState(initial.district);
  const [ward, setWard] = useState(initial.ward);
  const districts = province ? vietnamAddresses[province] : undefined;
  const wards = district && districts ? districts[district] : [];

  return (
    <fieldset className="address-fields">
      <legend>Địa chỉ nhận hàng</legend>
      <div className="address-select-grid">
        <div className="field"><label htmlFor="province">Tỉnh / thành phố</label><select id="province" name="province" value={province} onChange={(event) => { setProvince(event.target.value); setDistrict(''); setWard(''); }} required><option value="">Chọn tỉnh / thành phố</option>{Object.keys(vietnamAddresses).map((name) => <option key={name} value={name}>{name}</option>)}</select></div>
        <div className="field"><label htmlFor="district">Quận / huyện</label><select id="district" name="district" value={district} onChange={(event) => { setDistrict(event.target.value); setWard(''); }} disabled={!province} required><option value="">Chọn quận / huyện</option>{Object.keys(districts ?? {}).map((name) => <option key={name} value={name}>{name}</option>)}</select></div>
        <div className="field"><label htmlFor="ward">Phường / xã</label><select id="ward" name="ward" value={ward} onChange={(event) => setWard(event.target.value)} disabled={!district} required><option value="">Chọn phường / xã</option>{wards.map((name) => <option key={name} value={name}>{name}</option>)}</select></div>
      </div>
      <div className="field"><label htmlFor="street-address">Số nhà, tên đường, thôn / ấp</label><input id="street-address" name="address" autoComplete="street-address" defaultValue={initial.streetAddress} required /></div>
    </fieldset>
  );
}