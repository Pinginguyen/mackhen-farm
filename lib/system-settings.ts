import { prisma } from '@/lib/prisma';

export type SystemSettings = {
  id: string;
  freeShippingThreshold: number;
  tasteGuaranteeText: string;
  updatedAt?: Date;
};

export const DEFAULT_SYSTEM_SETTINGS: SystemSettings = {
  id: 'default',
  freeShippingThreshold: 250000,
  tasteGuaranteeText: 'Bảo hiểm vị giác 100%: Ăn thử gói đầu tiên không hợp khẩu vị Tây Bắc, hoàn tiền hoặc đổi vị mới trong 24h.',
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