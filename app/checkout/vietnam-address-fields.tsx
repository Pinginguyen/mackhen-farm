'use client';

import { useEffect, useState } from 'react';

import { getVietnamAddressData, type VietnamAddressData } from '@/lib/vietnam-addresses';

function normalizeName(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase()
    .replace(/\b(thanh pho|tp|tinh|quan|q|huyen|thi xa|phuong|p|xa|thi tran)\b/g, ' ')
    .replace(/[.]/g, ' ').replace(/\s+/g, ' ').trim();
}

function splitAddress(value: string, data: VietnamAddressData) {
  const parts = value.split(',').map((part) => part.trim()).filter(Boolean);
  const province = data.provinces.find(({ name }) => normalizeName(name) === normalizeName(parts[0] ?? ''));
  const districts = province ? data.districts.filter((district) => district.idProvince === province.idProvince) : [];
  const district = districts.find(({ name }) => normalizeName(name) === normalizeName(parts[1] ?? ''));
  const communes = district ? data.communes.filter((commune) => commune.idDistrict === district.idDistrict) : [];
  const commune = communes.find(({ name }) => normalizeName(name) === normalizeName(parts[2] ?? ''));
  return {
    provinceId: province?.idProvince ?? '',
    districtId: district?.idDistrict ?? '',
    communeId: commune?.idCommune ?? '',
    streetAddress: commune ? parts.slice(3).join(', ') : parts.slice(province ? 1 : 0).join(', '),
  };
}

export default function VietnamAddressFields({ initialAddress = '' }: { initialAddress?: string }) {
  const [data, setData] = useState<VietnamAddressData>();
  const [initialized, setInitialized] = useState(false);
  const [provinceId, setProvinceId] = useState('');
  const [districtId, setDistrictId] = useState('');
  const [communeId, setCommuneId] = useState('');
  const [streetAddress, setStreetAddress] = useState('');

  useEffect(() => {
    let active = true;
    getVietnamAddressData().then((addressData) => {
      if (active) setData(addressData);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!data || initialized) return;
    const initial = splitAddress(initialAddress, data);
    setProvinceId(initial.provinceId);
    setDistrictId(initial.districtId);
    setCommuneId(initial.communeId);
    setStreetAddress(initial.streetAddress);
    setInitialized(true);
  }, [data, initialAddress, initialized]);

  const province = data?.provinces.find((item) => item.idProvince === provinceId);
  const districts = data?.districts.filter((item) => item.idProvince === provinceId) ?? [];
  const district = districts.find((item) => item.idDistrict === districtId);
  const communes = data?.communes.filter((item) => item.idDistrict === districtId) ?? [];
  const commune = communes.find((item) => item.idCommune === communeId);

  function displayProvince(name: string) {
    return name === 'Thành phố Hồ Chí Minh' ? 'TP. Hồ Chí Minh' : name.replace(/^Thành phố /, 'TP. ');
  }

  function displayDistrict(name: string) {
    return name === 'Thành phố Thủ Đức' ? 'TP. Thủ Đức' : name;
  }

  return (
    <fieldset className="address-fields">
      <legend>Địa chỉ nhận hàng</legend>
      <div className="address-select-grid">
        <div className="field"><label htmlFor="province">Tỉnh / thành phố</label><select id="province" name="province" value={province?.name ?? ''} onChange={(event) => { const selected = data?.provinces.find((item) => item.name === event.target.value); setProvinceId(selected?.idProvince ?? ''); setDistrictId(''); setCommuneId(''); }} disabled={!data} required><option value="">{data ? 'Chọn tỉnh / thành phố' : 'Đang tải địa chỉ...'}</option>{data?.provinces.map((item) => <option key={item.idProvince} value={item.name}>{displayProvince(item.name)}</option>)}</select></div>
        <div className="field"><label htmlFor="district">Quận / huyện</label><select id="district" name="district" value={district?.name ?? ''} onChange={(event) => { const selected = districts.find((item) => item.name === event.target.value); setDistrictId(selected?.idDistrict ?? ''); setCommuneId(''); }} disabled={!province} required><option value="">Chọn quận / huyện</option>{districts.map((item) => <option key={item.idDistrict} value={item.name}>{displayDistrict(item.name)}</option>)}</select></div>
        <div className="field"><label htmlFor="ward">Phường / xã</label><select id="ward" name="ward" value={commune?.name ?? ''} onChange={(event) => { const selected = communes.find((item) => item.name === event.target.value); setCommuneId(selected?.idCommune ?? ''); }} disabled={!district} required><option value="">Chọn phường / xã</option>{communes.map((item) => <option key={item.idCommune} value={item.name}>{item.name}</option>)}</select></div>
      </div>
      <div className="field"><label htmlFor="street-address">Số nhà, tên đường, thôn / ấp</label><input id="street-address" name="address" autoComplete="street-address" value={streetAddress} onChange={(event) => setStreetAddress(event.target.value)} required /></div>
    </fieldset>
  );
}