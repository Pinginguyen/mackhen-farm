import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const BATCH_CODE = 'BATCH-CRAFT-2026';
const PRODUCT_SLUG = 'mac-khen-xe-soi-cay-nong';
const harvestDate = new Date('2026-10-10T00:00:00.000Z');
const packagingDate = new Date('2026-10-12T00:00:00.000Z');
const expiryDate = new Date('2027-10-12T00:00:00.000Z');

async function main() {
  const product = await prisma.product.findUnique({
    where: { slug: PRODUCT_SLUG },
    include: { variants: { orderBy: { createdAt: 'asc' } } },
  });
  if (!product) throw new Error(`Product not found: ${PRODUCT_SLUG}`);

  const profile = await prisma.storeProfileSettings.findUnique({ where: { id: 'default' } });
  const labResult = profile?.dppLabResult ?? 'Chưa có kết quả kiểm nghiệm được cấu hình.';
  const variant = product.variants[0];
  const receivingNote = [
    'Nhà cung cấp: Vùng trồng Mắc Khén, Bản Hua Tạt, Vân Hồ, Sơn La.',
    `Ngày thu hoạch nguyên liệu: ${harvestDate.toISOString().slice(0, 10)}.`,
    'Sơ chế và chế biến: nguyên liệu được làm sạch, phối trộn với gia vị; sấy nhiệt độ thấp ở 60°C, mục tiêu độ ẩm dưới 7,5% theo hồ sơ quy trình do cơ sở cung cấp.',
    `Thông tin kiểm nghiệm VSATTP do cơ sở cung cấp: ${labResult}. Chưa đính kèm phiếu kiểm nghiệm độc lập gắn riêng với mã lô này.`,
    `Ngày đóng gói: ${packagingDate.toISOString().slice(0, 10)}.`,
    `Thành phẩm: ${product.name}${variant?.weight ? `, quy cách ${variant.weight}` : product.unit ? `, quy cách ${product.unit}` : ''}.`,
  ].join('\n');

  const existing = await prisma.productionLot.findUnique({ where: { batchCode: BATCH_CODE } });
  const data = {
    productId: product.id,
    productVariantId: variant?.id ?? null,
    mfgDate: packagingDate,
    expDate: expiryDate,
    receivedQty: Math.max(product.stock, 1),
    availableQty: product.stock,
    status: 'ACTIVE',
    testReportUrl: null,
    receivingNote,
  };
  const lot = existing
    ? await prisma.productionLot.update({ where: { batchCode: BATCH_CODE }, data })
    : await prisma.productionLot.create({ data: { ...data, batchCode: BATCH_CODE, qrToken: randomUUID() } });

  console.log(`Saved ${lot.batchCode} for ${product.name}; QR token preserved/generated, quantity ${lot.receivedQty}.`);
}

main().catch((error) => {
  console.error('Could not seed traceability batch:', error);
  process.exitCode = 1;
}).finally(async () => {
  await prisma.$disconnect();
});
