import { prisma } from '@/lib/prisma';

export type RecommendedProduct = {
  id: string;
  slug: string;
  name: string;
  image: string;
  images: string[];
  highlights: string[];
  variants: { id: string }[];
  price: number;
  stock: number;
  reason: 'frequently-bought-together' | 'same-category';
};

export async function getProductRecommendations(sourceProductIds: string[], limit = 4): Promise<RecommendedProduct[]> {
  const sourceIds = [...new Set(sourceProductIds.filter(Boolean))];
  if (!sourceIds.length || limit < 1) return [];

  try {
    const sources = await prisma.product.findMany({
      where: { id: { in: sourceIds }, active: true },
      select: { id: true, category: true },
    });
    if (!sources.length) return [];

    const sourceSet = new Set(sources.map((source) => source.id));
    const categories = [...new Set(sources.map((source) => source.category))];
    const purchases = await prisma.orderItem.findMany({
      where: {
        productId: { in: [...sourceSet] },
        order: { is: { paymentStatus: 'PAID', orderStatus: { in: ['DELIVERED', 'COMPLETED'] } } },
      },
      select: { orderId: true, productId: true },
      orderBy: { order: { createdAt: 'desc' } },
      take: 3000,
    });
    const orderSources = new Map<string, Set<string>>();
    for (const purchase of purchases) {
      const sourceProducts = orderSources.get(purchase.orderId) ?? new Set<string>();
      sourceProducts.add(purchase.productId);
      orderSources.set(purchase.orderId, sourceProducts);
    }

    const orderIds = [...orderSources.keys()];
    const pairScores = new Map<string, number>();
    if (orderIds.length) {
      const pairedItems = await prisma.orderItem.findMany({
        where: { orderId: { in: orderIds }, productId: { notIn: [...sourceSet] } },
        select: { orderId: true, productId: true },
        take: 6000,
      });
      const countedPairs = new Set<string>();
      for (const item of pairedItems) {
        const key = `${item.orderId}:${item.productId}`;
        if (countedPairs.has(key)) continue;
        countedPairs.add(key);
        pairScores.set(item.productId, (pairScores.get(item.productId) ?? 0) + (orderSources.get(item.orderId)?.size ?? 1));
      }
    }

    const products = await prisma.product.findMany({
      where: {
        active: true,
        stock: { gt: 0 },
        id: { notIn: [...sourceSet] },
        OR: [
          ...(pairScores.size ? [{ id: { in: [...pairScores.keys()] } }] : []),
          { category: { in: categories } },
        ],
      },
      select: { id: true, slug: true, name: true, image: true, images: true, highlights: true, variants: { select: { id: true } }, price: true, stock: true },
    });

    return products
      .sort((left, right) => (pairScores.get(right.id) ?? 0) - (pairScores.get(left.id) ?? 0) || left.name.localeCompare(right.name, 'vi'))
      .slice(0, limit)
      .map((product) => ({
        ...product,
        images: product.images ?? [],
        highlights: product.highlights ?? [],
        variants: product.variants ?? [],
        reason: pairScores.has(product.id) ? 'frequently-bought-together' : 'same-category',
      }));
  } catch (error) {
    console.warn('Product recommendations unavailable.', error instanceof Error ? error.name : 'UnknownError');
    return [];
  }
}