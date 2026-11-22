import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const BATCHES = [
  { batchCode: 'BATCH-CRAFT-2026', productSlug: 'mac-khen-xe-soi-cay-nong' },
  { batchCode: 'BATCH-MIEN-DEO-2026', productSlug: 'mac-khen-mieng-deo-tieu-rung' },
  { batchCode: 'BATCH-TOI-2026', productSlug: 'mac-khen-chay-toi-gion-cay' },
  { batchCode: 'BATCH-COMBO-2026', productSlug: 'combo-bo-ba-nhau-xanh' },
  {
    batchCode: 'BATCH-CHEO-2026',
    productSlug: 'cham-cheo-uot-chuan-vi-dien-bien',
    missingProduct: {
      name: 'Chẳm Chéo Ướt Chuẩn Vị Điện Biên', category: 'Gia vị Tây Bắc', price: 45000,
      unit: 'Hũ nắp nhôm 250g', weight: 250, protein: '2.2g/100g', calories: 68, stock: 100,
      description: 'Chẳm chéo ướt đậm vị gia vị vùng Điện Biên, dùng chấm món luộc, nướng và rau củ.',
      ingredients: 'Ớt tươi Điện Biên, tỏi nếp, rau thơm Tây Bắc, hạt dổi, mắc khén và gia vị.',
      image: '/products/cham-cheo.jpg', highlight: 'Điện Biên',
    },
  },
  {
    batchCode: 'BATCH-MAC-KHEN-2026',
    productSlug: 'hat-mac-khen-rung-sao-kho-son-la',
    missingProduct: {
      name: 'Hạt Mắc Khén Rừng Sao Khô Sơn La', category: 'Gia vị Tây Bắc', price: 55000,
      unit: 'Túi zip nhôm 200g', weight: 200, protein: '8.5g/100g', calories: 285, stock: 100,
      description: 'Hạt mắc khén rừng sao khô, gia vị đặc trưng dùng làm chẳm chéo và nêm món ăn.',
      ingredients: '100% hạt mắc khén rừng tự nhiên Tây Bắc, sàng lọc sạch cuống.',
      image: '/products/hat-mac-khen.jpg', highlight: 'Sơn La',
    },
  },
  {
    batchCode: 'BATCH-DOI-2026',
    productSlug: 'hat-doi-rung-nep-thuong-hang',
    missingProduct: {
      name: 'Hạt Dổi Rừng Nếp Thượng Hạng', category: 'Gia vị Tây Bắc', price: 120000,
      unit: 'Hũ thủy tinh 50g', weight: 50, protein: '11.2g/100g', calories: 315, stock: 100,
      description: 'Hạt dổi rừng tuyển chọn, hương thơm đặc trưng để làm gia vị chấm và nêm món nướng.',
      ingredients: '100% hạt dổi rừng tự nhiên Tây Bắc, sàng lọc sạch cuống.',
      image: '/products/hat-doi.jpg', highlight: 'Thượng hạng',
    },
  },
  {
    batchCode: 'BATCH-MUOI-CHEO-2026',
    productSlug: 'muoi-cham-cheo-hat-doi-rang-kho',
    missingProduct: {
      name: 'Muối Chẳm Chéo Hạt Dổi Rang Khô', category: 'Gia vị Tây Bắc', price: 39000,
      unit: 'Hũ rắc 2 nấc 150g', weight: 150, protein: '3.1g/100g', calories: 82, stock: 100,
      description: 'Muối chẳm chéo rang khô cùng hạt dổi, tiện nêm nếm và chấm món ăn.',
      ingredients: 'Muối, ớt, hạt dổi rang, mắc khén và rau thơm Tây Bắc; phối trộn và rang khô.',
      image: '/products/muoi-cham-cheo.jpg', highlight: 'Hạt dổi rang',
    },
  },
];
const harvestDate = new Date('2026-10-10T00:00:00.000Z');
const packagingDate = new Date('2026-10-12T00:00:00.000Z');
const expiryDate = new Date('2027-10-12T00:00:00.000Z');

async function main() {
  const profile = await prisma.storeProfileSettings.findUnique({ where: { id: 'default' } });
  const labResult = profile?.dppLabResult ?? 'Chưa có kết quả kiểm nghiệm được cấu hình.';
  for (const batch of BATCHES) {
    let product = await prisma.product.findUnique({
      where: { slug: batch.productSlug },
      include: { variants: { orderBy: { createdAt: 'asc' } } },
    });
    if (!product && batch.missingProduct) {
      const details = batch.missingProduct;
      product = await prisma.product.create({
        data: {
          slug: batch.productSlug,
          ...details,
          images: [details.image],
          rating: 0,
          active: true,
          variants: {
            create: {
              title: details.unit,
              price: details.price,
              weight: `${details.weight}g`,
              inventory: details.stock,
            },
          },
        },
        include: { variants: { orderBy: { createdAt: 'asc' } } },
      });
      console.log(`Created missing catalog product ${product.slug}.`);
    }
    if (!product) throw new Error(`Product not found: ${batch.productSlug}`);

    const variant = product.variants[0];
    const receivingNote = [
      `Nguồn nguyên liệu: ${product.originRegion ?? 'Sơn La, Tây Bắc'}.`,
      `Ngày thu hoạch/tiếp nhận nguyên liệu: ${harvestDate.toISOString().slice(0, 10)}.`,
      `Thành phần theo hồ sơ sản phẩm: ${product.ingredients ?? 'đang cập nhật'}. Nguyên liệu được sơ tuyển, chế biến theo đặc tính sản phẩm và đóng gói thành ${product.name}.`,
      `Thông tin kiểm nghiệm VSATTP do cơ sở cung cấp: ${labResult}. Chưa đính kèm phiếu kiểm nghiệm độc lập gắn riêng với mã lô này.`,
      `Ngày đóng gói: ${packagingDate.toISOString().slice(0, 10)}.`,
      `Quy cách: ${variant?.weight ?? product.unit ?? 'đang cập nhật'}.`,
    ].join('\n');

    const lot = await prisma.productionLot.upsert({
      where: { batchCode: batch.batchCode },
      create: {
        batchCode: batch.batchCode,
        qrToken: randomUUID(),
        productId: product.id,
        productVariantId: variant?.id ?? null,
        mfgDate: packagingDate,
        expDate: expiryDate,
        receivedQty: Math.max(product.stock, 1),
        availableQty: product.stock,
        status: 'ACTIVE',
        testReportUrl: null,
        receivingNote,
      },
      update: {
        productId: product.id,
        productVariantId: variant?.id ?? null,
        mfgDate: packagingDate,
        expDate: expiryDate,
        receivedQty: Math.max(product.stock, 1),
        availableQty: product.stock,
        status: 'ACTIVE',
        testReportUrl: null,
        receivingNote,
      },
    });

    console.log(`Saved ${lot.batchCode} for ${product.name}; QR token preserved/generated, quantity ${lot.receivedQty}.`);
  }
}

main().catch((error) => {
  console.error('Could not seed traceability batch:', error);
  process.exitCode = 1;
}).finally(async () => {
  await prisma.$disconnect();
});
