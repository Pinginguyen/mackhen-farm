import { prisma } from '@/lib/prisma';

export type CoreContentSettings = {
  announcementBarText: string;
  announcementBarEnabled: boolean;
  contactHotline: string;
  contactZalo: string;
  businessName: string;
  businessTaxCode: string;
  bctVerifiedUrl: string;
  homePromoTitle: string;
  homePromoVoucherCode: string;
};

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
} & CoreContentSettings & {
  updatedAt?: Date;
};

export type PublicSystemSettings = Pick<SystemSettings,
  'companyName' | 'taxCode' | 'representativeName' | 'address' | 'hotline' | 'email' | 'b2bItemsPerCarton' | 'b2bCartonWeightKg' | 'dppSupplyGPS' | 'dppLabResult' | keyof CoreContentSettings
>;

export const DEFAULT_CORE_CONTENT_SETTINGS: CoreContentSettings = {
  announcementBarText: 'MẮC KHÉN SAO KHÔ SƠN LA • 22G ĐẠM THỰC VẬT / 100G • FREESHIP TOÀN QUỐC TỪ 250K • GIAO NHANH 2H • 100% NGUYÊN LIỆU UPCYCLED',
  announcementBarEnabled: true,
  contactHotline: '0762.793.244',
  contactZalo: 'https://zalo.me/0762793244',
  businessName: 'CÔNG TY CỔ PHẦN NÔNG SẢN SINH THÁI MẮC KHÉN FARM',
  businessTaxCode: '0110892644 do Sở KH&ĐT cấp ngày 15/01/2026',
  bctVerifiedUrl: 'http://online.gov.vn',
  homePromoTitle: 'Combo Bộ Ba Nhậu Xanh - Giảm 20%',
  homePromoVoucherCode: 'NHIEUXANH20',
};

export const CORE_CONTENT_SETTING_KEYS: Record<keyof CoreContentSettings, string> = {
  announcementBarText: 'ANNOUNCEMENT_BAR_TEXT',
  announcementBarEnabled: 'ANNOUNCEMENT_BAR_ENABLED',
  contactHotline: 'CONTACT_HOTLINE',
  contactZalo: 'CONTACT_ZALO',
  businessName: 'BUSINESS_NAME',
  businessTaxCode: 'BUSINESS_TAX_CODE',
  bctVerifiedUrl: 'BCT_VERIFIED_URL',
  homePromoTitle: 'HOME_PROMO_TITLE',
  homePromoVoucherCode: 'HOME_PROMO_VOUCHER_CODE',
};

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
  ...DEFAULT_CORE_CONTENT_SETTINGS,
};

export async function getCoreContentSettings(profileFallback?: Pick<SystemSettings, 'companyName' | 'taxCode' | 'hotline'>): Promise<CoreContentSettings> {
  try {
    const [entries, profile] = await Promise.all([
      prisma.systemSetting.findMany({ select: { key: true, value: true } }),
      profileFallback
        ? Promise.resolve(profileFallback)
        : prisma.storeProfileSettings.findUnique({ where: { id: 'default' }, select: { companyName: true, taxCode: true, hotline: true } }),
    ]);
    const values = new Map(entries.map(({ key, value }) => [key, value]));
    const enabled = values.get('ANNOUNCEMENT_BAR_ENABLED');

    return {
      announcementBarText: values.get('ANNOUNCEMENT_BAR_TEXT') ?? DEFAULT_CORE_CONTENT_SETTINGS.announcementBarText,
      announcementBarEnabled: enabled === undefined ? DEFAULT_CORE_CONTENT_SETTINGS.announcementBarEnabled : enabled.toLowerCase() === 'true',
      contactHotline: values.get('CONTACT_HOTLINE') ?? profile?.hotline ?? DEFAULT_CORE_CONTENT_SETTINGS.contactHotline,
      contactZalo: values.get('CONTACT_ZALO') ?? DEFAULT_CORE_CONTENT_SETTINGS.contactZalo,
      businessName: values.get('BUSINESS_NAME') ?? profile?.companyName ?? DEFAULT_CORE_CONTENT_SETTINGS.businessName,
      businessTaxCode: values.get('BUSINESS_TAX_CODE') ?? profile?.taxCode ?? DEFAULT_CORE_CONTENT_SETTINGS.businessTaxCode,
      bctVerifiedUrl: values.get('BCT_VERIFIED_URL') ?? DEFAULT_CORE_CONTENT_SETTINGS.bctVerifiedUrl,
      homePromoTitle: values.get('HOME_PROMO_TITLE') ?? DEFAULT_CORE_CONTENT_SETTINGS.homePromoTitle,
      homePromoVoucherCode: values.get('HOME_PROMO_VOUCHER_CODE') ?? DEFAULT_CORE_CONTENT_SETTINGS.homePromoVoucherCode,
    };
  } catch {
    return {
      ...DEFAULT_CORE_CONTENT_SETTINGS,
      contactHotline: profileFallback?.hotline ?? DEFAULT_CORE_CONTENT_SETTINGS.contactHotline,
      businessName: profileFallback?.companyName ?? DEFAULT_CORE_CONTENT_SETTINGS.businessName,
      businessTaxCode: profileFallback?.taxCode ?? DEFAULT_CORE_CONTENT_SETTINGS.businessTaxCode,
    };
  }
}

export async function getSystemSettings(): Promise<SystemSettings> {
  try {
    const profile = await prisma.storeProfileSettings.upsert({
      where: { id: 'default' },
      update: {},
      create: { id: 'default' },
    });
    const content = await getCoreContentSettings(profile);
    return {
      ...profile,
      ...content,
      companyName: content.businessName,
      taxCode: content.businessTaxCode,
      hotline: content.contactHotline,
    };
  } catch {
    return DEFAULT_SYSTEM_SETTINGS;
  }
}