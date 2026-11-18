export type ProductVariant = {
  id: string;
  title?: string;
  label: string;
  price: number;
  originalPrice?: number | null;
  flashSaleEndsAt?: Date | string | null;
  weight: string;
  inventory?: number;
  stock: number;
  sku?: string | null;
  status: string;
};

export type NutritionFacts = {
  enabled: boolean;
  servingSize: string;
  calories: string;
  protein: string;
  fat: string;
  cholesterol: string;
  fiber: string;
  carbohydrates: string;
  sodium: string;
};

export type SensoryProfile = {
  spicy: number;
  smoky: number;
  chewiness: number;
  crispness: number;
  sweetAftertaste: number;
};

export type PairingGuide = {
  recommendedDrink: string;
  servingTip: string;
};

export function normalizeSensoryProfile(value: unknown): SensoryProfile | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const profile = value as Record<string, unknown>;
  const fields = ['spicy', 'smoky', 'chewiness', 'crispness', 'sweetAftertaste'] as const;
  if (fields.some((field) => !Number.isInteger(profile[field]) || Number(profile[field]) < 1 || Number(profile[field]) > 5)) return null;
  return Object.fromEntries(fields.map((field) => [field, Number(profile[field])])) as SensoryProfile;
}

export function normalizePairingGuide(value: unknown): PairingGuide | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const guide = value as Record<string, unknown>;
  if ((guide.recommendedDrink !== undefined && typeof guide.recommendedDrink !== 'string')
    || (guide.servingTip !== undefined && typeof guide.servingTip !== 'string')) return null;
  const recommendedDrink = typeof guide.recommendedDrink === 'string' ? guide.recommendedDrink.trim() : '';
  const servingTip = typeof guide.servingTip === 'string' ? guide.servingTip.trim() : '';
  return recommendedDrink || servingTip ? { recommendedDrink, servingTip } : null;
}

export function normalizeNutritionFacts(value: unknown): NutritionFacts | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const facts = value as Record<string, unknown>;
  const fields = ['servingSize', 'calories', 'protein', 'fat', 'cholesterol', 'fiber', 'carbohydrates', 'sodium'] as const;
  if (typeof facts.enabled !== 'boolean' || fields.some((field) => typeof facts[field] !== 'string')) return null;
  return {
    enabled: facts.enabled,
    servingSize: facts.servingSize as string,
    calories: facts.calories as string,
    protein: facts.protein as string,
    fat: facts.fat as string,
    cholesterol: facts.cholesterol as string,
    fiber: facts.fiber as string,
    carbohydrates: facts.carbohydrates as string,
    sodium: facts.sodium as string,
  };
}

export type Product = {
  id: string;
  slug: string;
  name: string;
  category: string;
  price: number;
  originalPrice?: number | null;
  flashSaleEndsAt?: Date | string | null;
  unit?: string | null;
  weight?: number | null;
  protein?: string | null;
  calories?: number | null;
  images?: string[];
  rating: number;
  stock: number;
  status: 'Còn hàng' | 'Sắp hết';
  description: string;
  ingredients?: string | null;
  image: string;
  highlight: string;
  badge?: string | null;
  badgeText?: string | null;
  spiciness?: number;
  chewiness?: number;
  aroma?: number;
  labelAxis1?: string;
  labelAxis2?: string;
  labelAxis3?: string;
  valueAxis1?: number;
  valueAxis2?: number;
  valueAxis3?: number;
  upsellProductId?: string | null;
  nutritionFacts?: NutritionFacts | null;
  sensoryProfile?: SensoryProfile | null;
  pairingGuide?: PairingGuide | null;
  originRegion?: string | null;
  waxSealCode?: string | null;
  highlights?: string[];
  variants: ProductVariant[];
};

export function formatCurrency(value: number): string {
  return `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(value)}đ`;
}
