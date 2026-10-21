export type Locale = 'vi' | 'en';
export type Currency = 'VND' | 'SGD';

export const SGD_TO_VND = 19000;

export const translations = {
  vi: {
    home: 'Trang chủ',
    products: 'Sản phẩm',
    deals: 'Khuyến mãi',
    cart: 'Giỏ hàng',
    trackOrder: 'Tra cứu đơn',
    addToCart: 'Thêm vào giỏ',
    buyNow: 'Mua ngay',
    placeOrder: 'Đặt hàng',
    login: 'Đăng nhập',
    shopNow: 'Chọn mua',
  },
  en: {
    home: 'Home',
    products: 'Products',
    deals: 'Deals',
    cart: 'Cart',
    trackOrder: 'Track Order',
    addToCart: 'Add to Cart',
    buyNow: 'Buy Now',
    placeOrder: 'Place Order',
    login: 'Login',
    shopNow: 'Shop now',
  },
} as const;

export type TranslationKey = keyof typeof translations.vi;

const productNames: Record<string, string> = {
  'Mắc Khén Xé Sợi Cay Nồng': 'Spicy Shredded Plant-Based Jerky',
  'Mắc Khén Miếng Dẻo Tiêu Rừng': 'Tender Wild Pepper Plant-Based Slices',
  'Combo Bộ Ba Nhậu Xanh': 'Green Trio Gift Box',
  'Chẳm Chéo Ướt Chuẩn Vị Điện Biên': 'Authentic Dien Bien Dipping Sauce',
};

export function translateProductName(name: string, locale: Locale): string {
  return locale === 'en' ? productNames[name] ?? name : name;
}

export function formatCurrency(amount: number, currency: Currency): string {
  if (currency === 'SGD') return `S$ ${(amount / SGD_TO_VND).toFixed(2)}`;
  return `${Math.round(amount).toLocaleString('vi-VN')}đ`;
}

export function formatApproxVnd(amount: number): string {
  return `~${Math.round(amount).toLocaleString('vi-VN')}đ`;
}