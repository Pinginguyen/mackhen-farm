const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

const products = [
  {
    name: 'Chẳm Chéo Ướt Chuẩn Vị Điện Biên',
    slug: 'cham-cheo-uot-chuan-vi-dien-bien',
    category: 'Gia vị Tây Bắc',
    price: 45000,
    unit: 'Hũ nắp nhôm 250g',
    weight: 250,
    protein: '2.2g/100g',
    calories: 68,
    rating: 0,
    stock: 100,
    description: 'Chẳm chéo ướt đậm vị gia vị vùng Điện Biên, dùng chấm món luộc, nướng và rau củ.',
    image: '/products/cham-cheo.jpg',
    highlight: 'Điện Biên',
  },
  {
    name: 'Hạt Mắc Khén Rừng Sao Khô Sơn La',
    slug: 'hat-mac-khen-rung-sao-kho-son-la',
    category: 'Gia vị Tây Bắc',
    price: 55000,
    unit: 'Túi zip nhôm 200g',
    weight: 200,
    protein: '8.5g/100g',
    calories: 285,
    rating: 0,
    stock: 100,
    description: 'Hạt mắc khén rừng sao khô, gia vị đặc trưng dùng làm chẳm chéo và nêm món ăn.',
    image: '/products/hat-mac-khen.jpg',
    highlight: 'Sơn La',
  },
  {
    name: 'Hạt Dổi Rừng Nếp Thượng Hạng',
    slug: 'hat-doi-rung-nep-thuong-hang',
    category: 'Gia vị Tây Bắc',
    price: 120000,
    unit: 'Hũ thủy tinh 50g',
    weight: 50,
    protein: '11.2g/100g',
    calories: 315,
    rating: 0,
    stock: 100,
    description: 'Hạt dổi rừng tuyển chọn, hương thơm đặc trưng để làm gia vị chấm và nêm món nướng.',
    image: '/products/hat-doi.jpg',
    highlight: 'Thượng hạng',
  },
  {
    name: 'Muối Chẳm Chéo Hạt Dổi Rang Khô',
    slug: 'muoi-cham-cheo-hat-doi-rang-kho',
    category: 'Gia vị Tây Bắc',
    price: 39000,
    unit: 'Hũ rắc 2 nấc 150g',
    weight: 150,
    protein: '3.1g/100g',
    calories: 82,
    rating: 0,
    stock: 100,
    description: 'Muối chẳm chéo rang khô cùng hạt dổi, tiện nêm nếm và chấm món ăn.',
    image: '/products/muoi-cham-cheo.jpg',
    highlight: 'Hạt dổi rang',
  },
  {
    name: 'Mắc Khén Xé Sợi Cay Nồng',
    slug: 'mac-khen-xe-soi-cay-nong',
    category: 'Khô chay Tây Bắc',
    price: 65000,
    unit: 'Túi zip 150g',
    weight: 150,
    protein: '22.5g/100g',
    calories: 285,
    rating: 4.9,
    stock: 120,
    description: 'Khô bò thực vật xé sợi dai, đậm vị mắc khén và hạt dổi; 22.5g protein/100g, không cholesterol.',
    image: '/products/xe-soi.jpg',
    highlight: 'Cay nồng',
  },
  {
    name: 'Mắc Khén Miếng Dẻo Tiêu Rừng',
    slug: 'mac-khen-mieng-deo-tieu-rung',
    category: 'Khô chay Tây Bắc',
    price: 65000,
    unit: 'Túi zip 150g',
    weight: 150,
    protein: '21.0g/100g',
    calories: 295,
    rating: 4.8,
    stock: 110,
    description: 'Khô bò thực vật dạng miếng dẻo, phối vị mật mía và tiêu rừng Tây Bắc.',
    image: '/products/mieng-deo.jpg',
    highlight: 'Tiêu rừng',
  },
  {
    name: 'Mắc Khén Cháy Tỏi Giòn Cay',
    slug: 'mac-khen-chay-toi-gion-cay',
    category: 'Khô chay Tây Bắc',
    price: 85000,
    unit: 'Hũ 200g',
    weight: 200,
    protein: '23.8g/100g',
    calories: 325,
    rating: 5,
    stock: 90,
    description: 'Khô bò thực vật giòn cay kết hợp tỏi phi và gia vị mắc khén.',
    image: '/products/chay-toi.jpg',
    highlight: 'Tỏi giòn',
  },
  {
    name: 'Combo Bộ Ba Nhậu Xanh',
    slug: 'combo-bo-ba-nhau-xanh',
    category: 'Combo quà',
    price: 169000,
    originalPrice: 215000,
    unit: 'Hộp 450g',
    weight: 450,
    protein: '98g/hộp',
    calories: 1350,
    rating: 4.9,
    stock: 60,
    description: 'Hộp quà đủ ba hương vị khô bò thực vật, tổng khối lượng 450g.',
    image: '/products/combo.jpg',
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
