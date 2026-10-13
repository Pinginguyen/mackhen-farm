require('dotenv').config();

const { hash } = require('bcryptjs');
const { PrismaClient } = require('../generated/prisma');

const prisma = new PrismaClient();
const email = 'admin@mackhenfarm.vn';
const name = 'Quản Trị Viên Mắc Khén Farm';

async function main() {
  const password = process.env.ADMIN_INITIAL_PASSWORD;
  if (!password || password.length < 10) {
    throw new Error('ADMIN_INITIAL_PASSWORD is required and must contain at least 10 characters.');
  }

  const passwordHash = await hash(password, 12);
  const user = await prisma.user.upsert({
    where: { email },
    create: { email, name, password: passwordHash, role: 'ADMIN' },
    update: { name, password: passwordHash, role: 'ADMIN' },
    select: { email: true, name: true, role: true },
  });

  console.log(`Admin account ready: ${user.email} (${user.role}).`);
}

main()
  .catch((error) => {
    console.error('Admin bootstrap failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());