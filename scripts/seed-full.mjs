import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const PRODUCTS = [
  {
    name: 'Khô Bò Thực Vật Mắc Khén Xé Sợi Cay Nồng',
    slug: 'mac-khen-xe-soi-cay-nong',
    category: 'Khô chay Tây Bắc',
    price: 65000,
    originalPrice: 85000,
    unit: 'Túi 150g',
    weight: 150,
    protein: '22g Đạm / 100g',
    image: '/products/xe-soi.jpg',
    description: 'Thức quà lai rai thượng hạng từ đạm thực vật bản địa, ủ đượm gia vị mắc khén sao giòn và hạt dổi nướng than vùng cao.',
    highlight: '22g Đạm thực vật • Vị cay nồng Tây Bắc',
    stock: 500,
  },
  {
    name: 'Mắc Khén Cháy Tỏi Giòn Cay',
    slug: 'mac-khen-chay-toi-gion-cay',
    category: 'Khô chay Tây Bắc',
    price: 85000,
    originalPrice: 105000,
    unit: 'Hũ 200g',
    weight: 200,
    protein: '24g Đạm / 100g',
    image: '/products/chay-toi.jpg',
    description: 'Từng sợi đạm đậu nành giòn rụm kết hợp tỏi cô đơn phi thơm lừng cùng mắc khén sao vàng.',
    highlight: 'Tỏi phi giòn rụm • Thơm lừng mắc khén',
    stock: 500,
  },
  {
    name: 'Mắc Khén Miếng Dẻo Tiêu Rừng',
    slug: 'mac-khen-mieng-deo-tieu-rung',
    category: 'Khô chay Tây Bắc',
    price: 65000,
    originalPrice: 85000,
    unit: 'Túi 150g',
    weight: 150,
    protein: '22g Đạm / 100g',
    image: '/products/mieng-deo.jpg',
    description: 'Khô miếng bản to dẻo mềm, ngấm trọn hạt tiêu rừng cay dịu và gia vị tự nhiên.',
    highlight: 'Miếng dẻo đậm đà • Tiêu rừng thơm ấm',
    stock: 500,
  },
  {
    name: 'Combo Bộ Ba Nhậu Xanh',
    slug: 'combo-bo-ba-nhau-xanh',
    category: 'Combo quà',
    price: 169000,
    originalPrice: 215000,
    unit: 'Hộp 450g',
    weight: 450,
    protein: '68g Đạm / combo',
    image: '/products/combo.jpg',
    description: 'Bộ sưu tập trọn vẹn 3 hương vị đặc trưng Tây Bắc, đóng hộp quà kraft tinh tế kèm voucher ưu đãi.',
    highlight: 'Đủ 3 vị độc bản • Tiết kiệm 46.000đ',
    stock: 500,
  },
  {
    name: 'Chẳm Chéo Ướt Chuẩn Vị Điện Biên',
    slug: 'cham-cheo-uot',
    category: 'Gia vị Tây Bắc',
    price: 45000,
    originalPrice: 55000,
    unit: 'Hũ 250g',
    weight: 250,
    protein: 'Gia vị thảo mộc',
    image: '/products/cham-cheo.jpg',
    description: 'Chẳm chéo ướt giã tay từ mắc khén, hạt dổi, rau thơm rừng và ớt chỉ thiên.',
    highlight: 'Giã tay thủ công • Chấm gì cũng cuốn',
    stock: 500,
  },
  {
    name: 'Hạt Mắc Khén Rừng Sao Khô Sơn La',
    slug: 'hat-mac-khen-sao-kho',
    category: 'Gia vị Tây Bắc',
    price: 55000,
    originalPrice: 70000,
    unit: 'Hũ 100g',
    weight: 100,
    protein: 'Gia vị nguyên hạt',
    image: '/products/hat-mac-khen.jpg',
    description: 'Mắc khén thu hái tự nhiên từ rừng già Sơn La, sao giòn thơm phức.',
    highlight: 'Thu hái tự nhiên • Thơm cay tê đầu lưỡi',
    stock: 500,
  },
  {
    name: 'Muối Chẳm Chéo Hạt Dổi Rang Khô',
    slug: 'muoi-cham-cheo-hat-doi',
    category: 'Gia vị Tây Bắc',
    price: 35000,
    originalPrice: 45000,
    unit: 'Hũ 120g',
    weight: 120,
    protein: 'Gia vị khô',
    image: '/products/muoi-cham-cheo.jpg',
    description: 'Muối rang khô kết hợp hạt dổi nướng than thơm nức và mắc khén cay the.',
    highlight: 'Hạt dổi nướng than • Tiện lợi bảo quản',
    stock: 500,
  },
  {
    name: 'Hạt Dổi Rừng Nếp Thượng Hạng',
    slug: 'hat-doi-rung-nep',
    category: 'Gia vị Tây Bắc',
    price: 120000,
    originalPrice: 150000,
    unit: 'Túi 50g',
    weight: 50,
    protein: 'Vàng đen Tây Bắc',
    image: '/products/hat-doi.jpg',
    description: 'Hạt dổi rừng nếp loại 1, thơm ngậy đặc trưng của núi rừng Tây Bắc.',
    highlight: 'Hạt dổi nếp loại 1 • Mùi thơm nức mũi',
    stock: 500,
  }
];

async function main() {
  console.log('🔄 Đang nạp sản phẩm và cấp Lô sản xuất (ProductionLot)...');
  
  for (const item of PRODUCTS) {
    const product = await prisma.product.upsert({
      where: { slug: item.slug },
      update: {
        name: item.name,
        price: item.price,
        originalPrice: item.originalPrice,
        stock: item.stock,
        image: item.image,
        description: item.description,
        highlight: item.highlight,
      },
      create: {
        name: item.name,
        slug: item.slug,
        category: item.category,
        price: item.price,
        originalPrice: item.originalPrice,
        unit: item.unit,
        weight: item.weight,
        protein: item.protein,
        image: item.image,
        description: item.description,
        highlight: item.highlight,
        stock: item.stock,
        active: true,
      }
    });

    // Tạo Variant
    const variant = await prisma.productVariant.upsert({
      where: {
        productId_title: {
          productId: product.id,
          title: item.unit
        }
      },
      update: {
        price: item.price,
        originalPrice: item.originalPrice,
        inventory: item.stock,
      },
      create: {
        productId: product.id,
        title: item.unit,
        price: item.price,
        originalPrice: item.originalPrice,
        weight: `${item.weight}g`,
        inventory: item.stock,
        sku: `SKU-${item.slug.toUpperCase()}`,
      }
    });

    // Cấp Lô sản xuất có sẵn qrToken và batchCode unique
    const batchCode = `LOT-${item.slug.toUpperCase()}-2026`;
    const expDate = new Date();
    expDate.setFullYear(expDate.getFullYear() + 2);

    await prisma.productionLot.upsert({
      where: { batchCode },
      update: {
        availableQty: 500,
        expDate: expDate,
        status: 'ACTIVE'
      },
      create: {
        batchCode,
        productId: product.id,
        productVariantId: variant.id,
        mfgDate: new Date(),
        expDate: expDate,
        receivedQty: 500,
        availableQty: 500,
        status: 'ACTIVE',
        qrToken: `QR-${item.slug.toUpperCase()}-2026`
      }
    });
  }

  // Khởi tạo Cài đặt cửa hàng mặc định
  await prisma.storeProfileSettings.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      companyName: 'CÔNG TY CỔ PHẦN NÔNG SẢN SINH THÁI MẮC KHÉN FARM',
      taxCode: '0110892644 do Sở KH&ĐT cấp ngày 15/01/2026',
      representativeName: 'Trần Trung Châu',
      address: 'Bản Hua Tạt, Xã Vân Hồ, Tỉnh Sơn La',
      hotline: '0762.793.244',
      email: 'contact@mackhenfarm.vn',
      freeShippingThreshold: 250000,
    }
  });

  console.log('🎉 XONG 100%! Toàn bộ 8 sản phẩm và Lô sản xuất FEFO đã nạp thành công vào Neon DB mới.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
