const { PrismaClient } = require('../generated/prisma');
require('dotenv').config();

const prisma = new PrismaClient();

const products = [
  {
    name: 'Mắc Khén Xé Sợi Cay Nồng',
    slug: 'mac-khen-xe-soi-cay-nong',
    category: 'Khô chay Tây Bắc',
    price: 65000,
    unit: 'Túi zip 150g',
    weight: 150,
    protein: 22,
    calories: null,
    rating: 4.9,
    stock: 120,
    description: 'Vị cay tê Tây Bắc từ mắc khén và hạt dổi nướng, xé sợi dai sần sật nhai lai rai. Hàm lượng 22g protein thực vật, không cholesterol.',
    image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=80',
    highlight: 'Cay nồng',
  },
  {
    name: 'Mắc Khén Miếng Dẻo Tiêu Rừng',
    slug: 'mac-khen-mieng-deo-tieu-rung',
    category: 'Khô chay Tây Bắc',
    price: 65000,
    unit: 'Túi zip 150g',
    weight: 150,
    protein: null,
    calories: null,
    rating: 4.8,
    stock: 110,
    description: 'Bản to, mềm dẻo, ngọt thanh mật mía kết hợp tiêu rừng thơm nồng, phù hợp ăn vặt văn phòng xế chiều lành mạnh.',
    image: 'https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?w=600&auto=format&fit=crop&q=80',
    highlight: 'Tiêu rừng',
  },
  {
    name: 'Mắc Khén Cháy Tỏi Giòn Cay',
    slug: 'mac-khen-chay-toi-gion-cay',
    category: 'Khô chay Tây Bắc',
    price: 85000,
    unit: 'Hũ 200g',
    weight: 200,
    protein: null,
    calories: null,
    rating: 5.0,
    stock: 90,
    description: 'Kết hợp tép tỏi cô đơn phi giòn rụm cùng thớ khô thực vật cay tê, món mồi nhắm lai rai ít calo hoàn hảo cho người tập gym.',
    image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&auto=format&fit=crop&q=80',
    highlight: 'Tỏi giòn',
  },
  {
    name: 'Combo Bộ Ba Nhậu Xanh',
    slug: 'combo-bo-ba-nhau-xanh',
    category: 'Combo quà',
    price: 169000,
    originalPrice: 215000,
    unit: 'Hộp quà 3 túi 450g',
    weight: 450,
    protein: null,
    calories: null,
    rating: 4.9,
    stock: 60,
    description: 'Hộp quà đủ ba hương vị, tổng 450g; freeship toàn quốc và tặng kèm một gói mini.',
    image: 'https://images.unsplash.com/photo-1607346256330-dee7af15f7c5?w=600&auto=format&fit=crop&q=80',
    highlight: 'Combo quà',
  },
];

async function main() {
  const slugs = products.map((product) => product.slug);

  await prisma.$transaction(async (transaction) => {
    await transaction.product.updateMany({
      where: { slug: { notIn: slugs } },
      data: { active: false },
    });

    for (const product of products) {
      const savedProduct = await transaction.product.upsert({
        where: { slug: product.slug },
        update: {
          name: product.name,
          category: product.category,
          price: product.price,
          originalPrice: product.originalPrice ?? null,
          unit: product.unit,
          weight: product.weight,
          protein: product.protein,
          calories: product.calories,
          images: [product.image],
          rating: product.rating,
          description: product.description,
          image: product.image,
          highlight: product.highlight,
          active: true,
        },
        create: {
          slug: product.slug,
          name: product.name,
          category: product.category,
          price: product.price,
          originalPrice: product.originalPrice ?? null,
          unit: product.unit,
          weight: product.weight,
          protein: product.protein,
          calories: product.calories,
          images: [product.image],
          rating: product.rating,
          stock: product.stock,
          description: product.description,
          image: product.image,
          highlight: product.highlight,
          active: true,
        },
      });

      const existingVariant = await transaction.productVariant.findFirst({
        where: { productId: savedProduct.id },
      });
      const variantData = {
        label: product.unit,
        price: product.price,
        weight: `${product.weight}g`,
      };

      if (existingVariant) {
        await transaction.productVariant.update({
          where: { id: existingVariant.id },
          data: variantData,
        });
      } else {
        await transaction.productVariant.create({
          data: { ...variantData, stock: product.stock, productId: savedProduct.id },
        });
      }
    }
  });

  const count = await prisma.product.count({ where: { active: true } });
  console.log(`Seeded ${count} active products into database.`);
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
