import { prisma } from '@/lib/prisma';

export type SystemSettings = {
  id: string;
  freeShippingThreshold: number;
  tasteGuaranteeText: string;
  companyName: string;
  taxCode: string;
  representativeName: string;
  address: string;
  hotline: string;
  email: string;
  b2bItemsPerCarton: number;
  b2bCartonWeightKg: number;
  dppSupplyGPS: string;
  dppLabResult: string;
  updatedAt?: Date;
};

export type PublicSystemSettings = Pick<SystemSettings,
  'companyName' | 'taxCode' | 'representativeName' | 'address' | 'hotline' | 'email' | 'b2bItemsPerCarton' | 'b2bCartonWeightKg' | 'dppSupplyGPS' | 'dppLabResult'
>;

export const DEFAULT_SYSTEM_SETTINGS: SystemSettings = {
  id: 'default',
  freeShippingThreshold: 250000,
  tasteGuaranteeText: 'Bảo hiểm vị giác 100%: Ăn thử gói đầu tiên không hợp khẩu vị Tây Bắc, hoàn tiền hoặc đổi vị mới trong 24h.',
  companyName: 'CÔNG TY CỔ PHẦN NÔNG SẢN SINH THÁI MẮC KHÉN FARM',
  taxCode: '0110892644 do Sở KH&ĐT cấp ngày 15/01/2026',
  representativeName: 'Trần Trung Châu',
  address: 'Bản Hua Tạt, Xã Vân Hồ, Tỉnh Sơn La',
  hotline: '0762.793.244',
  email: 'contact@mackhenfarm.vn',
  b2bItemsPerCarton: 24,
  b2bCartonWeightKg: 3.6,
  dppSupplyGPS: '20.738°N, 104.912°E (Sơn La)',
  dppLabResult: 'Salmonella: Âm tính | E.Coli: < 10 CFU/g | Aflatoxin: ND',
};

export async function getSystemSettings(): Promise<SystemSettings> {
  try {
    const model = (prisma as unknown as { systemSetting?: { upsert?: (args: unknown) => Promise<SystemSettings> } }).systemSetting;
    if (!model?.upsert) return DEFAULT_SYSTEM_SETTINGS;
    return await model.upsert({
      where: { id: 'default' },
      update: {},
      create: { id: 'default' },
    });
  } catch {
    return DEFAULT_SYSTEM_SETTINGS;
  }
}