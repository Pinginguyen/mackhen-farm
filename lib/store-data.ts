export type ProductVariant = {
  id: string;
  label: string;
  price: number;
  weight: string;
  stock: number;
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
  nutritionFacts?: NutritionFacts | null;
  highlights?: string[];
  variants: ProductVariant[];
};

export function formatCurrency(value: number): string {
  return `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(value)}đ`;
}
