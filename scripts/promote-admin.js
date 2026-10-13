require('dotenv').config();

const { PrismaClient } = require('../generated/prisma');
const prisma = new PrismaClient();
const email = process.argv[2]?.trim().toLowerCase();

async function main() {
  if (!email) throw new Error('Usage: npm run admin:promote -- email@example.com');
  const user = await prisma.user.update({ where: { email }, data: { role: 'ADMIN' }, select: { email: true, role: true } });
  console.log(`Granted ${user.role} role to ${user.email}.`);
}

main()
  .catch((error) => {
    console.error('Admin promotion failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());