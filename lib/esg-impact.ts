export const DEFAULT_ESG_PACKAGE_WEIGHT_GRAMS = 100;

export type EsgImpactItem = {
  quantity: number;
  weightGrams?: number | null;
};

export function parsePackageWeightGrams(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) && value > 0 ? value : null;
  }
  if (typeof value !== 'string') return null;

  const match = value.trim().match(/^(\d+(?:[.,]\d+)?)\s*(kg|g|gram|grams)?$/i);
  if (!match) return null;
  const amount = Number(match[1].replace(',', '.'));
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return match[2]?.toLowerCase() === 'kg' ? amount * 1000 : amount;
}

export function calculateEsgImpact(items: EsgImpactItem[]) {
  const productWeightGrams = items.reduce((total, item) => {
    const quantity = Number.isFinite(item.quantity) && item.quantity > 0 ? item.quantity : 0;
    const weight = Number.isFinite(item.weightGrams) && (item.weightGrams ?? 0) > 0
      ? item.weightGrams!
      : DEFAULT_ESG_PACKAGE_WEIGHT_GRAMS;
    return total + quantity * weight;
  }, 0);

  return {
    soyPulpGrams: Math.round(productWeightGrams * 3 * 100) / 100,
    waterSavedLiters: Math.round(productWeightGrams * 8 * 100) / 100,
    co2AvoidedKg: Math.round(productWeightGrams * 0.024 * 100) / 100,
  };
}