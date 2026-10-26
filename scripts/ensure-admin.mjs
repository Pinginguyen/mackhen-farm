import { createRequire } from 'node:module';
import dotenv from 'dotenv';

dotenv.config();

const require = createRequire(import.meta.url);
const { PrismaClient } = require('@prisma/client');
const { hash } = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  const password = process.env.ADMIN_INITIAL_PASSWORD;
  if (!password || password.length < 10) {
    throw new Error('ADMIN_INITIAL_PASSWORD is required and must contain at least 10 characters.');
  }

  const passwordHash = await hash(password, 12);
  const user = await prisma.user.upsert({
    where: { email: 'admin@mackhenfarm.vn' },
    create: {
      email: 'admin@mackhenfarm.vn',
      password: passwordHash,
      name: 'Quản Trị Viên Mắc Khén Farm',
      role: 'ADMIN',
    },
    update: {
      password: passwordHash,
      name: 'Quản Trị Viên Mắc Khén Farm',
      role: 'ADMIN',
    },
    select: { email: true, name: true, role: true },
  });

  console.log(`Admin account ready: ${user.email} (${user.role}).`);
}

main()
  .catch((error) => {
    console.error('Admin bootstrap failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());