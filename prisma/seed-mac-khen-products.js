require('dotenv').config();

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const products = [
  {
    name: 'Mắc Khén Xé Sợi Cay Nồng',
    slug: 'mac-khen-xe-soi-cay-nong',
    price: 65000,
    stock: 500,
    unit: 'Túi 150g',
    weight: 150,
    protein: '22.5g/100g',
    calories: 285,
    image: '/products/xe-soi.jpg',
    description: 'Vị cay tê Tây Bắc từ hạt dổi mắc khén, giàu 22g protein thực vật, không cholesterol.',
    highlight: 'Cay nồng',
    highlights: ['22.5g protein thực vật / 100g', 'Khử mùi ngái đậu nành, đậm vị hạt dổi và mắc khén', 'Sợi dai, cay nồng kiểu Tây Bắc'],
    category: 'Khô chay Tây Bắc',
  },
  {
    name: 'Mắc Khén Miếng Dẻo Tiêu Rừng',
    slug: 'mac-khen-mieng-deo-tieu-rung',
    price: 65000,
    stock: 500,
    unit: 'Túi 150g',
    weight: 150,
    protein: '21.0g/100g',
    calories: 295,
    image: '/products/mieng-deo.jpg',
    description: 'Bản miếng to dẻo mềm ngấm mật mía và tiêu rừng thơm nồng, ăn vặt ít calo.',
    highlight: 'Tiêu rừng',
    highlights: ['21g protein thực vật / 100g', 'Miếng dẻo mềm, thấm vị mật mía', 'Hương tiêu rừng Tây Bắc'],
    category: 'Khô chay Tây Bắc',
  },
  {
    name: 'Mắc Khén Cháy Tỏi Giòn Cay',
    slug: 'mac-khen-chay-toi-gion-cay',
    price: 85000,
    stock: 350,
    unit: 'Hũ 200g',
    weight: 200,
    protein: '23.8g/100g',
    calories: 325,
    image: '/products/chay-toi.jpg',
    description: 'Kết hợp tép tỏi cô đơn phi giòn rụm cùng thớ khô thực vật cay tê, món mồi nhắm lai rai hoàn hảo.',
    highlight: 'Tỏi giòn',
    highlights: ['23.8g protein thực vật / 100g', 'Tỏi phi giòn thơm kết hợp mắc khén', 'Vị giòn cay đậm đà'],
    category: 'Khô chay Tây Bắc',
  },
  {
    name: 'Combo Bộ Ba Nhậu Xanh',
    slug: 'combo-bo-ba-nhau-xanh',
    price: 169000,
    stock: 200,
    unit: 'Hộp 450g',
    weight: 450,
    protein: '98g/hộp',
    calories: 1350,
    image: '/products/combo.jpg',
    description: 'Trọn bộ 3 vị đặc trưng. Miễn phí vận chuyển toàn quốc và tặng kèm gói dùng thử mini.',
    highlight: 'Combo quà',
    highlights: ['98g protein thực vật / hộp', 'Đủ ba hương vị khô thực vật', 'Hộp 450g thích hợp làm quà'],
    category: 'Combo quà',
  },
];

async function main() {
  const saved = await prisma.$transaction(async (transaction) => {
    const results = [];
    for (const product of products) {
      const savedProduct = await transaction.product.upsert({
        where: { slug: product.slug },
        create: {
          ...product,
          originalPrice: null,
          calories: product.calories,
          images: [product.image],
          rating: 0,
          active: true,
        },
        update: {
          name: product.name,
          category: product.category,
          price: product.price,
          originalPrice: null,
          unit: product.unit,
          weight: product.weight,
          protein: product.protein,
          calories: product.calories,
          images: [product.image],
          stock: product.stock,
          description: product.description,
          image: product.image,
          highlight: product.highlight,
          highlights: product.highlights,
          highlights: product.highlights,
          active: true,
        },
      });

      await transaction.productVariant.deleteMany({
        where: { productId: savedProduct.id, label: { not: product.unit } },
      });

      await transaction.productVariant.upsert({
        where: { productId_label: { productId: savedProduct.id, label: product.unit } },
        create: { productId: savedProduct.id, label: product.unit, price: product.price, weight: `${product.weight}g`, stock: product.stock },
        update: { price: product.price, weight: `${product.weight}g`, stock: product.stock },
      });
      results.push({ name: savedProduct.name, slug: savedProduct.slug, price: savedProduct.price, unit: savedProduct.unit, stock: savedProduct.stock });
    }
    return results;
  });

  console.log(`Upserted ${saved.length} Mắc Khén Farm products:`);
  console.log(JSON.stringify(saved, null, 2));
}

main()
  .catch((error) => {
    console.error('Mắc Khén Farm product seed failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());