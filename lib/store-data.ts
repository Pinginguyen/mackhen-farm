export type ProductVariant = {
  id: string;
  label: string;
  price: number;
  weight: string;
  stock: number;
  status: string;
};

export type Product = {
  id: string;
  slug: string;
  name: string;
  category: string;
  price: number;
  originalPrice?: number | null;
  unit?: string | null;
  weight?: number | null;
  protein?: number | null;
  calories?: number | null;
  images?: string[];
  rating: number;
  stock: number;
  status: 'Còn hàng' | 'Sắp hết';
  description: string;
  image: string;
  highlight: string;
  variants: ProductVariant[];
};

export function formatCurrency(value: number): string {
  return `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(value)}đ`;
}
