import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function test() {
  try {
    await prisma.$connect();
    const count = await prisma.product.count();
    console.log('KET NOI DATABASE THANH CONG! So san pham:', count);
  } catch (error) {
    console.error('LOI KET NOI DATABASE:', error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

await test();