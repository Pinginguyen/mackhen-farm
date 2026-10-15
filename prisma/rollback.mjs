import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

try {
  await prisma.$executeRawUnsafe('DROP TABLE IF EXISTS "Payment" CASCADE');
  await prisma.$executeRawUnsafe('DROP TABLE IF EXISTS "OrderItem" CASCADE');
  await prisma.$executeRawUnsafe('DROP TABLE IF EXISTS "Order" CASCADE');
  await prisma.$executeRawUnsafe('DROP TABLE IF EXISTS "Customer" CASCADE');
  await prisma.$executeRawUnsafe('DROP TABLE IF EXISTS "CartItem" CASCADE');
  await prisma.$executeRawUnsafe('DROP TABLE IF EXISTS "Cart" CASCADE');
  await prisma.$executeRawUnsafe('DROP TABLE IF EXISTS "ProductVariant" CASCADE');
  await prisma.$executeRawUnsafe('DROP TABLE IF EXISTS "Product" CASCADE');
  await prisma.$executeRawUnsafe('DROP TYPE IF EXISTS "PaymentStatus"');
  await prisma.$executeRawUnsafe('DROP TYPE IF EXISTS "OrderStatus"');
  await prisma.$executeRawUnsafe('DROP TABLE IF EXISTS "_prisma_migrations";');
  console.log('The initial schema was rolled back.');
} finally {
  await prisma.$disconnect();
}