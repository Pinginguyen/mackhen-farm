'use client';

import { useState } from 'react';
import { Anchor, Container, PackageCheck, Ship, Weight } from 'lucide-react';
import { calculateContainerFreight, CONTAINER_20FT_CAPACITY_CBM, MASTER_CARTON } from '@/lib/container-freight';
import { useLocaleCurrency } from '@/lib/i18n-context';

export default function ContainerFreightCalculator() {
  const [cartons, setCartons] = useState(24);
  const [cartonsPerPallet, setCartonsPerPallet] = useState(40);
  const { locale, currency } = useLocaleCurrency();
  const isEN = locale === 'en' || currency === 'SGD';
  const result = calculateContainerFreight(cartons, cartonsPerPallet);
  const number = (value: number, digits = 1) => new Intl.NumberFormat(isEN ? 'en-SG' : 'vi-VN', { maximumFractionDigits: digits }).format(value);

  return (
    <section className="container-freight" aria-labelledby="container-freight-title">
      <header className="container-freight-heading"><span><Container size={20} aria-hidden="true" /></span><div><p className="b2b-section-kicker">LOGISTICS PLANNING · 20FT GP</p><h2 id="container-freight-title">{isEN ? 'Container freight calculator' : 'Ước tính tải hàng container'}</h2></div></header>
      <div className="container-freight-inputs">
        <label>{isEN ? 'Master cartons' : 'Số thùng master carton'}<input type="number" min={0} step={1} value={cartons} onChange={(event) => setCartons(Math.max(0, Number(event.target.value) || 0))} /><small>{isEN ? '24 packs · 3.6 kg · 0.018 m³ per carton' : '24 gói · 3,6 kg · 0,018 m³ mỗi thùng'}</small></label>
        <label>{isEN ? 'Cartons per pallet (planning assumption)' : 'Thùng / pallet (giả định xếp hàng)'}<input type="number" min={1} step={1} value={cartonsPerPallet} onChange={(event) => setCartonsPerPallet(Math.max(1, Number(event.target.value) || 1))} /><small>{isEN ? 'ISO footprint: 1.2 × 1.0 m; adjust for actual carton dimensions and stack height.' : 'Mặt pallet ISO: 1,2 × 1,0 m; cần đối chiếu kích thước thùng và chiều cao xếp thực tế.'}</small></label>
      </div>
      <div className="container-freight-metrics">
        <article><PackageCheck size={18} aria-hidden="true" /><span>{isEN ? 'Product packs' : 'Gói sản phẩm'}</span><strong>{number(result.packs, 0)}</strong></article>
        <article><Weight size={18} aria-hidden="true" /><span>{isEN ? 'Net weight' : 'Khối lượng tịnh'}</span><strong>{number(result.netWeightKg, 1)} kg</strong></article>
        <article><Container size={18} aria-hidden="true" /><span>CBM</span><strong>{number(result.totalVolumeCbm, 3)} m³</strong></article>
        <article><Anchor size={18} aria-hidden="true" /><span>{isEN ? 'ISO pallets*' : 'Pallet ISO*'}</span><strong>{number(result.pallets, 0)}</strong></article>
      </div>
      <div className="container-fill-meter"><div><span>{isEN ? '20ft GP volume utilization' : 'Tỷ lệ lấp đầy container 20ft GP'}</span><strong>{number(result.containerFillPercent, 1)}%</strong></div><div className="container-fill-track" role="progressbar" aria-label={isEN ? 'Container fill' : 'Tỷ lệ lấp đầy container'} aria-valuemin={0} aria-valuemax={100} aria-valuenow={result.containerFillPercent}><span style={{ transform: `scaleX(${result.containerFillPercent / 100})` }} /></div><small>{number(result.totalVolumeCbm, 3)} / {number(CONTAINER_20FT_CAPACITY_CBM, 1)} m³ · {MASTER_CARTON.packs} {isEN ? 'packs per carton' : 'gói mỗi thùng'}</small></div>
      <p className="container-pallet-assumption">* {isEN ? 'Pallet count is a planning estimate based on the editable cartons-per-pallet assumption; confirm stacking and payload before booking.' : 'Số pallet là ước tính theo giả định thùng/pallet có thể chỉnh sửa; cần xác nhận cách xếp và tải trọng trước khi đặt chỗ.'}</p>
      <div className="container-incoterms"><article><span>FOB · Incoterms® 2020</span><strong>{isEN ? 'Cat Lai Port, Ho Chi Minh City' : 'Cảng Cát Lái (TP.HCM)'}</strong></article><article><span>CIF · Incoterms® 2020</span><strong>{isEN ? 'Jurong Port, Singapore' : 'Cảng Jurong (Singapore)'}</strong></article><p><Ship size={16} aria-hidden="true" />{isEN ? 'Estimated sea transit: 4–6 days; schedule and routing subject to carrier confirmation.' : 'Thời gian vận chuyển biển ước tính: 4–6 ngày; lịch và tuyến cần hãng tàu xác nhận.'}</p></div>
    </section>
  );
}